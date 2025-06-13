const express = require('express');
const router = express.Router();
const axios = require('axios');

// Middleware per proteggere la rotta admin


function requireAdmin(req, res, next) {
    // 1. Verifica se esiste la sessione e il tabId
    const tabId = req.query.tabId || req.body.tabId || req.headers['x-tab-id'];

    if (!tabId || !req.session.tabSessions || !req.session.tabSessions[tabId]) {
        console.warn('Accesso negato: tabId non valido o sessione non trovata', { tabId });
        return res.status(403).redirect('/');
    }

    // 2. Recupera la sessione specifica per questo tab
    const tabSession = req.session.tabSessions[tabId];

    // 3. Verifica autenticazione e ruolo
    if (tabSession.isAuthenticated && tabSession.role === 'admin') {
        return next();
    }

    console.warn('Accesso negato: privilegi insufficienti', {
        username: tabSession.username,
        role: tabSession.role,
        isAuthenticated: tabSession.isAuthenticated
    });

    res.status(403).redirect('/');
}


// Avvia il caricamento dati sui database
router.post('/upload-db', requireAdmin, async (req, res) => {
    // Configurazione comune per axios
    const axiosConfig = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 30000, // 10 secondi timeout
        validateStatus: function (status) {
            // Considera come successo qualsiasi status code < 500
            return status < 500;
        }
    };

    try {
        console.log('Inizio caricamento database...');

        // 1. Invia a PostgreSQL (Spring Boot)
        console.log('Invio richiesta a Spring Boot...');
        const pgResponse = await axios.post(
            'http://localhost:8082/api/upload-db',
            {}, // corpo vuoto (o req.body se necessario)
            axiosConfig
        );


        // 2. Invia a MongoDB
        console.log('Invio richiesta a MongoDB...');
        const mongoResponse = await axios.post(
            'http://localhost:3002/api/upload-db',
            {}, // corpo vuoto (o req.body se necessario)
            axiosConfig
        );


        // Risposta JSON invece di redirect
        res.json({
            success: true,
            message: 'Caricamento completato con successo!',
            details: {
                postgres: pgResponse.data,
                mongo: mongoResponse.data
            }
        });

    } catch (error) {
        console.error('Errore durante il caricamento:', error);

        res.status(500).json({
            success: false,
            message: error.response?.data?.message ||
                'Errore durante il caricamento del database',
            error: {
                code: error.code,
                status: error.response?.status
            }
        });
    }
});
module.exports = router;