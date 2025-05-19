const loadRTReviews = require('../services/loadRTReviews');
const connectDB = require('../databases/filmDB');
const uploadRTReviews = async (csvPath) => {
    const connection = await connectDB();
    const RTReview = connection.model('RTReview');

    try {
        // 1. Controllo se esistono documenti nella collection
        const existingCount = await RTReview.countDocuments();
        if (existingCount > 0) {
            return {
                success: false,
                message: "La collection RTReview è già popolata",
                existingCount: existingCount
            };
        }

        // 2. Funzione di normalizzazione (identica)
        const normalizeReviewScore = (score) => {
            if (!score) return null;

            const strScore = score.toString().trim();

            // Caso 1: Frazioni (3/4, 5/10)
            const fractionMatch = strScore.match(/^(\d+)\s*\/\s*(\d+)$/);
            if (fractionMatch) {
                const numerator = parseFloat(fractionMatch[1]);
                const denominator = parseFloat(fractionMatch[2]);
                return denominator > 0 ? Math.round((numerator / denominator) * 5 * 10) / 10 : null;
            }

            // Caso 2: Percentuali (75%)
            const percentMatch = strScore.match(/^(\d+)%$/);
            if (percentMatch) {
                const percent = parseFloat(percentMatch[1]);
                return Math.round((percent / 100) * 5 * 10) / 10;
            }

            // Caso 3: Lettere (A+, B-)
            const letterMatch = strScore.match(/^([A-F][+-]?)$/i);
            if (letterMatch) {
                const letterMap = {
                    'A+': 5.0, 'A': 4.8, 'A-': 4.5,
                    'B+': 4.2, 'B': 3.8, 'B-': 3.5,
                    'C+': 3.2, 'C': 2.8, 'C-': 2.5,
                    'D+': 2.2, 'D': 1.8, 'D-': 1.5,
                    'F': 0.5
                };
                return letterMap[letterMatch[1].toUpperCase()] || null;
            }

            // Caso 4: Scala diretta (3.5/5)
            const directMatch = strScore.match(/^(\d+(?:\.\d+)?)\s*\/\s*5$/);
            if (directMatch) {
                return parseFloat(directMatch[1]);
            }

            return null;
        };

        // 3. Process record function (identica)
        const processRecord = (record) => {
            return {
                ...record,
                normalized_score: normalizeReviewScore(record.review_score),
                original_score: record.review_score
            };
        };

        // 4. MODIFICA PRINCIPALE: Chiamata al service ottimizzato
        const result = await loadRTReviews(
            RTReview, // Passiamo il modello inizializzato
            csvPath,
            processRecord,
            5000 // Batch size ottimale
        );

        if (!result.success) {
            throw new Error(result.error);
        }

        // 5. Creazione indici (identica)
        await RTReview.createIndexes([
            { name: 'movie_title_idx', key: { movie_title: 1 } },
            { name: 'normalized_score_idx', key: { normalized_score: -1 } }
        ]);

        // 6. Statistiche (identica)
        const stats = await RTReview.aggregate([
            { $group: {
                    _id: "$review_type",
                    count: { $sum: 1 },
                    avgNormalized: { $avg: "$normalized_score" }
                }}
        ]);

        return {
            success: true,
            insertedCount: result.loaded,
            skipped: result.skipped,
            stats: {
                scoresNormalized: result.loaded,
                scoreDistribution: stats
            }
        };

    } catch (error) {
        console.error('Error in uploadRTReviews:', error);
        return {
            success: false,
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        };
    }
};

const getFilmReviews = async (movieTitle, limit = 10, offset = 0, minRating = null, maxRating = null) => {
    const connection = await connectDB();
    const RTReview = connection.model('RTReview');

    try {
        // Costruzione query base
        const query = {
            movie_title: { $regex: new RegExp(movieTitle, 'i') }
        };

        // Aggiunta filtri rating se presenti
        if (minRating !== null || maxRating !== null) {
            query.normalized_score = {};
            if (minRating !== null) query.normalized_score.$gte = parseFloat(minRating);
            if (maxRating !== null) query.normalized_score.$lte = parseFloat(maxRating);
        }

        // Esecuzione query ottimizzata
        const [reviews, totalCount] = await Promise.all([
            RTReview.find(query)
                .sort({
                    normalized_score: -1, // Prima le recensioni meglio valutate
                    review_date: -1      // A parità di rating, le più recenti
                })
                .skip(offset)
                .limit(limit)
                .lean(),
            RTReview.countDocuments(query)
        ]);

        // Calcolo statistiche aggiuntive
        const ratingStats = await RTReview.aggregate([
            { $match: query },
            { $group: {
                    _id: null,
                    avgRating: { $avg: "$normalized_score" },
                    minRating: { $min: "$normalized_score" },
                    maxRating: { $max: "$normalized_score" }
                }}
        ]);

        return {
            success: true,
            data: reviews,
            total: totalCount,
            limit,
            offset,
            stats: {
                avgRating: ratingStats[0]?.avgRating || 0,
                minRating: ratingStats[0]?.minRating || 0,
                maxRating: ratingStats[0]?.maxRating || 0
            }
        };
    } catch (error) {
        console.error('Error in getFilmReviews:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const advancedReviewsSearch = async (params) => {
    const connection = await connectDB();
    const RTReview = connection.model('RTReview');

    try {
        // Destrutturazione corretta dei parametri
        const { query = {}, sort = {}, page = 0, size = 15, topCriticsOnly = false } = params;
        const { movie_title, critic_name, normalized_score } = query;

        // Costruzione query con approccio più robusto
        const mongoQuery = {};

        if (movie_title) {
            mongoQuery.movie_title = { $regex: movie_title, $options: 'i' };
        }

        if (critic_name) {
            mongoQuery.critic_name = { $regex: critic_name, $options: 'i' };
        }

        if (normalized_score) {
            mongoQuery.normalized_score = { $gte: parseFloat(normalized_score) };
        }

        if (topCriticsOnly) {
            mongoQuery.top_critic = true;
        }

        // Gestione ordinamento per rating (esclude null)
        if (sort.normalized_score) {
            mongoQuery.normalized_score = mongoQuery.normalized_score || {};
            mongoQuery.normalized_score.$ne = null;
        }

        // Esecuzione query
        const [reviews, totalCount, ratingStats] = await Promise.all([
            RTReview.find(mongoQuery)
                .sort(sort)
                .skip(page * size)
                .limit(size)
                .lean(),
            RTReview.countDocuments(mongoQuery),
            RTReview.aggregate([
                { $match: mongoQuery },
                { $group: {
                        _id: null,
                        avgRating: { $avg: "$normalized_score" },
                        minRating: { $min: "$normalized_score" },
                        maxRating: { $max: "$normalized_score" },
                        topCriticsCount: {
                            $sum: {
                                $cond: [{ $eq: ["$top_critic", true] }, 1, 0]
                            }
                        }
                    }}
            ])
        ]);

        return {
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                size: parseInt(size),
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / size)
            },
            stats: {
                avgRating: ratingStats[0]?.avgRating || 0,
                minRating: ratingStats[0]?.minRating || 0,
                maxRating: ratingStats[0]?.maxRating || 0,
                topCriticsCount: ratingStats[0]?.topCriticsCount || 0
            }
        };

    } catch (error) {
        console.error('Error in advancedReviewsSearch:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (connection && connection.readyState === 1) {
            await connection.close();
        }
    }
};

module.exports = {
    advancedReviewsSearch,
    uploadRTReviews,
    getFilmReviews
};