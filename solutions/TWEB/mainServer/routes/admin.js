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
    // Configurazione axios con timeout disabilitato
    const axiosConfig = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 0, // Timeout disabilitato (attesa infinita)
        validateStatus: function (status) {
            // Accetta qualsiasi status code (gestiamo noi gli errori)
            return true;
        }
    };

    try {
        console.log('Avvio caricamento PARALLELO dei database...');

        // Avvia entrambe le chiamate contemporaneamente
        const [pgResponse, mongoResponse] = await Promise.all([
            axios.post('http://localhost:8082/api/upload-db', {}, axiosConfig)
                .then(response => {
                    console.log('Spring Boot risposta ricevuta');
                    return response;
                })
                .catch(error => {
                    console.error('Errore Spring Boot:', error.message);
                    return { data: { success: false, message: error.message } };
                }),

            axios.post('http://localhost:3002/api/upload-db', {}, axiosConfig)
                .then(response => {
                    console.log('MongoDB risposta ricevuta');
                    return response;
                })
                .catch(error => {
                    console.error('Errore MongoDB:', error.message);
                    return { data: { success: false, message: error.message } };
                })
        ]);

        // Analisi dei risultati
        const allSuccess = pgResponse.data.success && mongoResponse.data.success;

        res.status(allSuccess ? 200 : 207) // 207 Multi-Status se un servizio ha fallito
            .json({
                success: allSuccess,
                message: allSuccess
                    ? 'Caricamento completato con successo!'
                    : 'Caricamento parzialmente riuscito',
                details: {
                    postgres: pgResponse.data,
                    mongo: mongoResponse.data
                }
            });

    } catch (error) {
        // Questo catch intercetta solo errori nella gestione parallela
        console.error('Errore nel coordinamento:', error);

        res.status(500).json({
            success: false,
            message: 'Errore durante il coordinamento del caricamento',
            error: {
                name: error.name,
                message: error.message
            }
        });
    }
});
module.exports = router;