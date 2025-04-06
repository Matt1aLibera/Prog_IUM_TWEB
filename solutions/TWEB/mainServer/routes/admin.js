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
    // Configurazione comune per axios
    const axiosConfig = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 10000, // 10 secondi timeout
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

        console.log('Risposta da Spring Boot:', {
            status: pgResponse.status,
            data: pgResponse.data
        });

        // 2. Invia a MongoDB
        console.log('Invio richiesta a MongoDB...');
        const mongoResponse = await axios.post(
            'http://localhost:3002/api/upload-db',
            {}, // corpo vuoto (o req.body se necessario)
            axiosConfig
        );

        console.log('Risposta da MongoDB:', {
            status: mongoResponse.status,
            data: mongoResponse.data
        });

        // Costruisci messaggio combinato
        const messages = [
            pgResponse.data?.message || `PostgreSQL: ${pgResponse.statusText || 'OK'}`,
            mongoResponse.data?.message || `MongoDB: ${mongoResponse.statusText || 'OK'}`
        ].filter(Boolean).join(" | ");

        req.flash('success', `Database aggiornato! ${messages}`);

    } catch (error) {
        // Gestione errori dettagliata
        const errorDetails = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            config: error.config,
            response: error.response ? {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            } : null
        };

        console.error('Errore dettagliato durante il caricamento:', errorDetails);

        // Determina quale chiamata ha fallito
        const isPgError = error.config?.url?.includes('8082');
        const serviceName = isPgError ? 'PostgreSQL (Spring Boot)' : 'MongoDB';

        // Messaggio d'errore più informativo
        const errorMsg = error.response?.data?.message
            || (error.response?.status ? `${serviceName} risposta con status ${error.response.status}` : null)
            || (error.code === 'ECONNABORTED' ? `Timeout connessione a ${serviceName}`: null)
            || `Errore durante il caricamento a ${serviceName}: ${error.message}`;

        req.flash('error', errorMsg);

        // Se fallisce il primo, non proseguire con il secondo
        if (isPgError) {
            console.log('Salto chiamata a MongoDB per errore PostgreSQL');
            res.redirect('/admin');
            return;
        }
    }

    res.redirect('/admin');
});

module.exports = router;