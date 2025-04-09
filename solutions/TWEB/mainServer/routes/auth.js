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
        const { username, password } = req.body;

        // 1. Verifica campi obbligatori
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username e password obbligatori'
            });
        }

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

        // 4. Creazione sessione
        const user = response.data.user;
        req.session.user = {
            id: user._id || user.id,
            username: user.username,
            role: user.role,
            isAuthenticated: true
        };

        // 5. Risposta JSON
        res.json({
            success: true,
            user: {
                id: user._id || user.id,
                username: user.username,
                role: user.role
            }
            // Non serve più il redirect, gestito dal frontend
        });

    } catch (error) {
        console.error('Login error:', error);
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
    req.session.destroy(err => {
        if (err) {
            console.error('Errore durante il logout:', err);
            return res.status(500).json({ success: false, error: 'Errore durante il logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
})

router.get('/check', (req, res) => {
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.status(401).json({
            authenticated: false
        });
    }
});

module.exports = router;