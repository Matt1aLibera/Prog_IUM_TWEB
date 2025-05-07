const express = require('express');
const passport = require('passport');
const axios = require('axios');
const router = express.Router();

// Configurazione
const AUTH_SERVER = 'http://localhost:3001'; // URL auth-server

// Route per ottenere i form di autenticazione
router.get('/forms', (req, res) => {
    try {
        res.render('partials/Form', {
            layout: null,
            showRegister: false
        });
    } catch (error) {
        console.error('Error rendering auth forms:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Strategia Passport per comunicare con l'auth-server
passport.use('remote', new (require('passport-local').Strategy)({
    passReqToCallback: true
}, async (req, username, password, done) => {
    try {
        console.log(`Tentativo di connessione a: ${AUTH_SERVER}/auth/verify`);
        const response = await axios.post(`${AUTH_SERVER}/auth/verify`, {
            username,
            password
        });

        if (!response.data.success) {
            return done(null, false, { message: response.data.error });
        }

        // Normalizzazione dell'oggetto user
        const user = response.data.user;
        if (user._id && !user.id) {
            user.id = user._id; // Aggiungiamo id per compatibilità
        }

        return done(null, user);

    } catch (error) {
        return done(null, false, {
            message: error.response?.data?.error || 'Errore durante l\'autenticazione'
        });
    }
}));

// Handle Login
// Versione semplificata con solo API JSON
router.post('/login', async (req, res) => {
    try {
        const { username, password, tabId } = req.body; // Aggiunto tabId

        // 1. Verifica campi obbligatori
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username e password obbligatori'
            });
        }

        // Debug: stampa i dati ricevuti
        console.log('Dati login ricevuti:', {
            username,
            tabId,
            hasPassword: !!password // Stampa solo se esiste (per sicurezza)
        });

        // 2. Chiamata all'auth-server
        const response = await axios.post(`${AUTH_SERVER}/auth/verify`, {
            username,
            password
        });

        // 3. Se l'auth-server rifiuta
        if (!response.data.success) {
            return res.status(401).json({
                success: false,
                error: response.data.error || 'Credenziali non valide'
            });
        }

        // 4. Creazione sessione CON tabId
        const user = response.data.user;
        // Inizializza tabSessions se non esiste
        req.session.tabSessions = req.session.tabSessions || {};

        // Crea/aggiorna la sessione per questo tabId
        req.session.tabSessions[tabId] = {
            id: user._id || user.id,
            username: user.username,
            role: user.role,
            isAuthenticated: true,
            uniqueSessionId: crypto.randomUUID()
        };

        console.log('Nuova sessione creata per tab:', {
            tabId: tabId,
            sessionId: req.sessionID,
            userData: req.session.tabSessions[tabId]
        });

        res.json({
            success: true,
            user: req.session.tabSessions[tabId],
            tabId: tabId
        });

    } catch (error) {
        console.error('Login error:', {
            error: error.message,
            stack: error.stack,
            requestData: req.body
        });
        res.status(500).json({
            success: false,
            error: error.response?.data?.error || 'Errore durante il login'
        });
    }
});

// Route Registrazione
router.post('/register', async (req, res) => {
    try {
        const response = await axios.post(`${AUTH_SERVER}/auth/register`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Registration error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'Errore durante la registrazione'
        });
    }
});

// Route di logout
router.post('/logout', (req, res) => {
    const tabId = req.body.tabId;

    if (tabId && req.session.tabSessions?.[tabId]) {
        console.log('Logout per tab:', tabId);
        delete req.session.tabSessions[tabId]; // Rimuove solo la sotto-sessione
    }

    // Se non ci sono più tab attivi, distrugge la sessione HTTP
    if (!req.session.tabSessions || Object.keys(req.session.tabSessions).length === 0) {
        req.session.destroy(err => {
            if (err) console.error('Errore destroy sessione:', err);
            res.clearCookie('connect.sid');
            res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
});

router.get('/check', (req, res) => {
    const tabId = req.query.tabId;

    if (!tabId || !req.session.tabSessions?.[tabId]) {
        console.log('Nessuna sessione attiva per tab:', tabId, {
            allTabs: req.session.tabSessions ? Object.keys(req.session.tabSessions) : 'no tabs'
        });
        return res.status(401).json({ authenticated: false });
    }

    const currentSession = req.session.tabSessions[tabId];
    console.log('Sessione valida per tab:', {
        tabId,
        user: currentSession.username,
        sessionData: currentSession
    });

    // Aggiungi tabId alla risposta!
    res.json({
        authenticated: true,
        user: {
            ...currentSession,
            tabId: tabId // Questo risolve il mismatch lato client
        }
    });
});

module.exports = router;