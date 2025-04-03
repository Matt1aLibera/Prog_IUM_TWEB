const express = require('express');
const axios = require('axios');
const router = express.Router();

// Middleware per proteggere la rotta admin
function requireAuth(req, res, next) {
    if (req.session.user?.isAuthenticated) {
        return next();
    }
    res.redirect('/login');
}

function requireAdmin(req, res, next) {
    if (req.session.user?.isAuthenticated && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).redirect('/');
}

// Pagina admin con pulsante upload
router.get('/', requireAdmin, (req, res) => {
    res.render('pages/admin', {
        user: req.session.user // Modificato da req.user a req.session.user
    });
});

// Avvia il caricamento dati sui database
router.post('/upload-db', requireAdmin, async (req, res) => {
    try {
        // 1. Invia prima a PostgreSQL (Spring Boot)
        const pgResponse = await axios.post('http://localhost:8080/api/upload-db');

        // 2. Poi a MongoDB
        const mongoResponse = await axios.post('http://localhost:3002/api/upload-db');

        // Costruisci messaggio combinato
        const messages = [
            pgResponse.data.message,
            mongoResponse.data.message
        ].filter(Boolean).join(" | ");

        req.flash('success', `Database aggiornato! ${messages}`);
    } catch (error) {
        console.error('Errore durante il caricamento:', {
            pgError: error.response?.data || error.message,
            mongoError: error.response?.data || error.message
        });

        const errorMsg = error.response?.data?.message || 'Errore durante il caricamento dei dati';
        req.flash('error', errorMsg);
    }
    res.redirect('/admin');
});

module.exports = router;