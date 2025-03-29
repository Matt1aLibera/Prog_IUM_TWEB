const express = require('express');
const router = express.Router();
const { connectDB } = require('../databases/filmDB');
const { uploadRatings } = require('../controllers/filmRating');
const path = require('path');
const fs = require('fs');
const uploadRTReviews = require('../controllers/RTReview');
router.post('/ratings', async (req, res) => {
    const { movie_id, rating } = req.body;

    if (!movie_id || rating === undefined) {
        return res.status(400).json({ error: "Dati mancanti" });
    }

    const success = await upsertRating(movie_id, rating);
    res.status(success ? 200 : 500).json({ success });
});

// Recupera rating (GET /api/ratings/:movie_id)
router.get('/ratings/:movie_id', async (req, res) => {
    const rating = await getRating(parseInt(req.params.movie_id));
    res.json({ rating });
});

// Nuova route per il caricamento automatico
/*router.post('/upload-db', async (req, res) => {
    console.log('🌐 Chiamata API ricevuta da:', req.ip);
    try {
        const result = await uploadDB();
        res.json(result);
    } catch (error) {
        console.error('🔴 Errore API:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});*/

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


router.post('/upload-reviews', async (req, res) => {
    const result = await uploadReviews();
    res.status(result.success ? 200 : 500).json(result);
});


module.exports = router;