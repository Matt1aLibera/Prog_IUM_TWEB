const connectDB = require('../databases/filmDB');
const { parseCSV } = require('../services/loadRatings');

/**
 * Creates or updates a movie rating
 * @param {number} movie_id - Numeric movie identifier
 * @param {number} rating - Rating value (0-5)
 * @returns {boolean} True if operation succeeded
 */
const upsertRating = async (movie_id, rating) => {
    try {
        await FilmRating.findOneAndUpdate(
            { movie_id },
            { rating },
            { upsert: true, new: true } // Crea se non esiste
        );
        return true;
    } catch (error) {
        console.error('Errore salvataggio rating:', error);
        return false;
    }
};

/**
 * Retrieves rating for a specific movie
 * @param {number} movie_id - Numeric movie identifier
 * @returns {number|null} Rating value or null if not found/error
 */
const getRating = async (movie_id) => {
    try {
        const doc = await FilmRating.findOne({ movie_id });
        return doc ? doc.rating : null;
    } catch (error) {
        console.error('Errore recupero rating:', error);
        return null;
    }
};

/**
 * Uploads ratings data from CSV to database
 * @param {string} csvPath - Path to CSV file
 * @returns {Object} Upload result - {success: bool, insertedCount: number, sample?: Object[]}
 * @throws {Error} If collection already populated or file processing fails
 */
const uploadRatings = async (csvPath) => {
    const connection = await connectDB();
    const FilmRating = connection.model('FilmRating');

    try {
        // 1. Controllo se esistono documenti nella collection
        const existingCount = await FilmRating.countDocuments();
        if (existingCount > 0) {
            return {
                success: false,
                message: "La collection FilmRating è già popolata",
                existingCount: existingCount
            };
        }

        // 2. Procedura normale di caricamento (esistente)
        const data = await parseCSV(csvPath);
        if (data.length === 0) {
            return {
                success: false,
                message: "Nessun dato valido trovato nel CSV"
            };
        }

        const results = await FilmRating.insertMany(data, { ordered: false });

        return {
            success: true,
            insertedCount: results.length,
            sample: results.slice(0, 3)
        };
    } catch (error) {
        console.error('Error in uploadRatings:', error);
        throw error;
    }
};
/**
 * Finds films within specified rating range
 * @param {number} minRating - Minimum rating value (0-5)
 * @param {number} maxRating - Maximum rating value (0-5)
 * @param {number} limit - Maximum results to return
 * @returns {Object[]} Array of {id: number, rating: number}
 * @throws {Error} If database query fails
 */
const getFilmsByRatingRange = async (minRating, maxRating, limit) => {
    const connection = await connectDB();
    const FilmRating = connection.model('FilmRating'); // Ottieni il modello dalla connessione

    try {
        const films = await FilmRating.find({
            rating: { $gte: minRating, $lte: maxRating }
        })
            .select('movie_id rating -_id')
            .sort({ rating: -1 })
            .limit(limit)
            .lean();

        return films.map(film => ({
            id: film.movie_id,
            rating: film.rating
        }));
    } catch (error) {
        console.error('Errore in getFilmsByRatingRange:', error);
        throw error;
    }
};
/**
 * Gets rating for specific movie with validation
 * @param {number} movie_id - Numeric movie identifier
 * @returns {Object} Result with rating - {success: bool, rating?: number, message?: string}
 * @throws {Error} If database operation fails
 */
const getFilmRating = async (movie_id) => {
    const connection = await connectDB();
    const FilmRating = connection.model('FilmRating');
    try {
        const doc = await FilmRating.findOne({ movie_id });
        if (!doc) {
            return {
                success: false,
                message: "Film non trovato"
            };
        }
        return {
            success: true,
            rating: doc.rating
        };
    } catch (error) {
        console.error('Errore recupero rating:', error);
        throw error;
    }
};
/**
 * Retrieves ratings for multiple movies in single query
 * @param {number[]} filmIds - Array of movie IDs
 * @returns {Object[]} Array of {id: number, rating: number|null} (preserves input order)
 * @throws {Error} If database operation fails
 */
const getRatingsBatch = async (filmIds) => {
    const connection = await connectDB();
    const FilmRating = connection.model('FilmRating');

    try {
        // Converti gli ID a numeri per sicurezza
        const numericIds = filmIds.map(id => parseInt(id)).filter(id => !isNaN(id));

        const ratings = await FilmRating.find({
            movie_id: { $in: numericIds }
        })
            .select('movie_id rating -_id')
            .lean();

        // Creiamo una mappa per accesso veloce
        const ratingMap = {};
        ratings.forEach(r => {
            ratingMap[r.movie_id] = r.rating;
        });

        // Restituiamo un array con tutti gli ID richiesti, anche quelli senza rating
        return filmIds.map(id => ({
            id: parseInt(id),
            rating: ratingMap[parseInt(id)] || null
        }));
    } catch (error) {
        console.error('Errore in getRatingsBatch:', error);
        throw error;
    }
};

module.exports = {
    upsertRating,
    getRating,
    uploadRatings, // Aggiungi la nuova funzione
    getFilmsByRatingRange,
    getFilmRating,
    getRatingsBatch
};