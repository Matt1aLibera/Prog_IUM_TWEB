const express = require('express');
const router = express.Router();
const { connectDB } = require('../databases/filmDB');
const {getRatingsBatch, uploadRatings, getFilmsByRatingRange, getFilmRating } = require('../controllers/filmRating');
const path = require('path');
const fs = require('fs');
const {getFilmReviews, uploadRTReviews} = require('../controllers/RTReview');
//usa curl "http://localhost:3002/api/films/ratings"

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
        const films = await getFilmsByRatingRange(minRating, maxRating, limit);
        res.json(films);
    } catch (error) {
        console.error('Errore route /films/ratings:', error);
        res.status(500).json({
            error: "Errore interno del server",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
//usa curl -X GET "http://localhost:3002/api/films/1001003"
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

router.post('/ratings/batch', async (req, res) => {
    try {
        const { filmIds } = req.body;

        if (!filmIds || !Array.isArray(filmIds)) {
            return res.status(400).json({
                error: "Il campo 'filmIds' è obbligatorio e deve essere un array"
            });
        }

        // Utilizza il controller invece della logica diretta
        const ratings = await getRatingsBatch(filmIds);

        res.json(ratings);
    } catch (error) {
        console.error('Errore in /ratings/batch:', error);
        res.status(500).json({
            error: "Errore interno del server",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


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
            //ratings: ratingsResult,
            reviews: reviewsResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


router.post('/upload-reviews', async (req, res) => {
    const result = await uploadReviews();
    res.status(result.success ? 200 : 500).json(result);
});


module.exports = router;