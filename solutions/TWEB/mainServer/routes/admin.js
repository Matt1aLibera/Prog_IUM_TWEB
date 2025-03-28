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
        // Invece di processare localmente, inoltra la richiesta al mongo server
        const response = await axios.post('http://localhost:3001/api/upload-db');

        if (response.data.success) {
            req.flash('success', `Database aggiornato! ${response.data.message}`);
        } else {
            req.flash('error', response.data.error || 'Errore sconosciuto');
        }
    } catch (error) {
        console.error('Errore comunicazione con mongo server:', error.response?.data || error.message);
        req.flash('error', 'Errore durante il caricamento dei dati');
    }
    res.redirect('/admin');
});

module.exports = router;