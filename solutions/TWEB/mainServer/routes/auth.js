const express = require('express');
const passport = require('passport');
const axios = require('axios');
const router = express.Router();

// Configurazione
const AUTH_SERVER = 'http://localhost:3001'; // URL auth-server

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
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Chiamata diretta all'auth-server (senza Passport)
        const response = await axios.post('http://localhost:3001/auth/verify', {
            username,
            password
        });

        if (!response.data.success) {
            return res.render('pages/index', {
                error: response.data.error || 'Credenziali non valide',
                alertType: 'danger'
            });
        }

        // Rigenera la sessione
        req.session.regenerate(() => {
            const user = response.data.user;
            req.session.user = {
                id: user._id || user.id,
                username: user.username,
                role: user.role,
                isAuthenticated: true
            };

            res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).render('pages/index', {
            error: 'Errore durante il login',
            alertType: 'danger'
        });
    }
});
// Logout
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/index');
});

module.exports = router;