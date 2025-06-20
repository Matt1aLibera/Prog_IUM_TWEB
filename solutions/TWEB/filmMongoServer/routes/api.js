const express = require('express');
const router = express.Router();
const { connectDB } = require('../databases/filmDB');
const {getRatingsBatch, uploadRatings, getFilmsByRatingRange, getFilmRating } = require('../controllers/filmRating');
const path = require('path');
const fs = require('fs');
const {advancedReviewsSearch, getFilmReviews, uploadRTReviews} = require('../controllers/RTReview');
/**
 * POST /advanced-search/reviews - Advanced search for movie reviews with filtering and sorting
 * @param {Object} query - Search criteria {movie_title?, critic_name?}
 * @param {Object} sort - Sorting criteria {field: order}
 * @param {number} [page=0] - Pagination offset
 * @param {number} [size=15] - Items per page (max 100)
 * @param {boolean} [topCriticsOnly=false] - Filter only top critics
 * @returns {Object} 200 - {data: Review[], pagination: Object, stats: Object}
 * @throws {400} Missing required search criteria
 * @throws {500} Database query error
 */
router.post('/advanced-search/reviews', async (req, res) => {
    try {
        const { query = {}, sort = {}, page = 0, size = 15, topCriticsOnly = false } = req.body;

        // Validazione di base
        if (!query.movie_title && !query.critic_name) {
            return res.status(400).json({
                error: 'Specificare almeno il titolo del film o il nome del critico'
            });
        }

        console.log('Richiesta ricerca avanzata:', {
            query,
            sort,
            page,
            size,
            topCriticsOnly
        });

        const result = await advancedReviewsSearch({
            query,
            sort,
            page: Math.max(0, parseInt(page)),
            size: Math.min(Math.max(1, parseInt(size)), 100),
            topCriticsOnly
        });

        if (!result.success) {
            return res.status(500).json({
                error: result.error
            });
        }

        res.json({
            data: result.data,
            pagination: result.pagination,
            stats: result.stats
        });

    } catch (error) {
        console.error('Error in advanced reviews search:', error);
        res.status(500).json({
            error: "Errore interno del server",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
/**
 * GET /films/:title/reviews - Get reviews for specific movie title
 * @param {string} title - URL encoded movie title
 * @param {number} [limit=10] - Max results to return
 * @param {number} [offset=0] - Pagination offset
 * @param {number} [minRating] - Minimum normalized rating filter
 * @param {number} [maxRating] - Maximum normalized rating filter
 * @returns {Object} 200 - {reviews: Review[], pagination: Object, stats: Object}
 * @throws {500} Database query error
 */
router.get('/films/:title/reviews', async (req, res) => {
    try {
        const movieTitle = decodeURIComponent(req.params.title);
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const minRating = req.query.minRating ? parseFloat(req.query.minRating) : null;
        const maxRating = req.query.maxRating ? parseFloat(req.query.maxRating) : null;

        const result = await getFilmReviews(movieTitle, limit, offset, minRating, maxRating);

        if (!result.success) {
            return res.status(500).json({
                error: result.error
            });
        }

        res.json({
            reviews: result.data,
            pagination: {
                limit: result.limit,
                offset: result.offset,
                total: result.total
            },
            stats: result.stats
        });
    } catch (error) {
        res.status(500).json({
            error: "Errore interno del server",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
/**
 * GET /films/ratings - Find films within rating range
 * @param {number} [minRating=0] - Minimum rating (0-5)
 * @param {number} [maxRating=5] - Maximum rating (0-5)
 * @param {number} [limit=10] - Max results to return
 * @returns {Object} 200 - Array of film rating objects
 * @throws {400} Invalid rating range
 * @throws {500} Database query error
 */
router.get('/films/ratings', async (req, res) => {
    try {
        const minRating = parseFloat(req.query.minRating) || 0;
        const maxRating = parseFloat(req.query.maxRating) || 5;
        const limit = parseInt(req.query.limit) || 10;

        // Validazione input
        if (minRating < 0 || maxRating > 5 || minRating > maxRating) {
            return res.status(400).json({
                error: "Range di rating non valido"
            });
        }

        // Chiamata al controller
        const films = getFilmsByRatingRange(minRating, maxRating, limit);
        res.json(films);
    } catch (error) {
        console.error('Errore route /films/ratings:', error);
        res.status(500).json({
            error: "Errore interno del server",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
/**
 * GET /films/:id - Get average rating for specific movie ID
 * @param {number} id - Numeric movie identifier
 * @returns {Object} 200 - {id: number, rating: number}
 * @throws {400} Invalid movie ID format
 * @throws {404} Movie not found
 * @throws {500} Database error
 */
router.get('/films/:id', async (req, res) => {
    try {
        const movieId = parseInt(req.params.id);
        if (isNaN(movieId)) {
            return res.status(400).json({
                error: "ID film non valido"
            });
        }

        const result = await getFilmRating(movieId);
        if (!result.success) {
            return res.status(404).json({
                error: result.message
            });
        }

        res.json({
            id: movieId,
            rating: result.rating
        });
    } catch (error) {
        console.error('Errore route /films/:id:', error);
        res.status(500).json({
            error: "Errore interno del server",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
})

/**
 * POST /ratings/batch - Get ratings for multiple films in batch
 * @param {number[]} filmIds - Array of movie IDs
 * @returns {Object} 200 - Array of rating objects
 * @throws {400} Invalid input format
 * @throws {500} Database error
 */
router.post('/ratings/batch', async (req, res) => {
    try {
        const { filmIds } = req.body;

        if (!filmIds || !Array.isArray(filmIds)) {
            return res.status(400).json({
                error: "Il campo 'filmIds' è obbligatorio e deve essere un array"
            });
        }

        // Utilizza il controller invece della logica diretta
        const ratings = getRatingsBatch(filmIds);

        res.json(ratings);
    } catch (error) {
        console.error('Errore in /ratings/batch:', error);
        res.status(500).json({
            error: "Errore interno del server",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


/**
 * POST /upload-db - Upload CSV data to database (admin only)
 * @returns {Object} 200 - {reviews: UploadResult}
 * @throws {500} File processing error
 */
router.post('/upload-db', async (req, res) => {
    try {
        // Caricamento Ratings
        const ratingsPath = path.join(__dirname, '../csv/movies.csv');
        const ratingsResult = fs.existsSync(ratingsPath)
            ? await uploadRatings(ratingsPath)
            : { success: false, message: "File ratings.csv non trovato" };

        // Caricamento Reviews
        const reviewsPath = path.join(__dirname, '../csv/rotten_tomatoes_reviews.csv');
        const reviewsResult = fs.existsSync(reviewsPath)
            ? await uploadRTReviews(reviewsPath)
            : { success: false, message: "File rt_reviews.csv non trovato" };

        res.json({
            ratings: ratingsResult,
            reviews: reviewsResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;