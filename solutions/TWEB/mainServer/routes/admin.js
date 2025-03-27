const express = require('express');
const { processCSVFiles } = require('../services/uploadService');

const router = express.Router();

// Middleware per proteggere la rotta admin
function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    res.redirect('/');
}

// Pagina admin con pulsante upload
router.get('/admin', ensureAdmin, (req, res) => {
    res.render('pages/admin', { user: req.user });
});

// Avvia il caricamento dati sui database
router.post('/upload-db', ensureAdmin, async (req, res) => {
    try {
        await processCSVFiles(); // Chiamiamo la funzione che gestisce tutto
        res.send('Dati caricati con successo!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Errore durante il caricamento dei dati.');
    }
});

module.exports = router;