const express = require('express');
const router = express.Router();
const { upsertRating, getRating, uploadDB } = require('../controllers/filmRating');
// Salva/aggiorna rating (POST /api/ratings)
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
router.post('/upload-db', async (req, res) => {
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
});

module.exports = router;