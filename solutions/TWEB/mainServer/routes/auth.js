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
router.post('/login', (req, res, next) => {
    console.log('\n=== NUOVO TENTATIVO DI LOGIN ===');
    console.log('Dati ricevuti:', {
        username: req.body.username,
        password: '••••••'
    });

    passport.authenticate('remote', async (err, user, info) => {
        try {
            // Debug avanzato
            console.log('\n=== PASSPORT AUTH CALLBACK ===');
            console.log('Error:', err);
            console.log('User object:', JSON.stringify(user, null, 2));
            console.log('Session pre-login:', {
                id: req.sessionID,
                data: req.session
            });

            if (err) {
                console.error('[500] Errore autenticazione:', err.stack);
                return res.status(500).render('pages/index', {
                    error: 'Errore temporaneo del sistema',
                    alertType: 'danger',
                    formData: { username: req.body.username }
                });
            }

            if (!user) {
                console.warn('[401] Autenticazione fallita:', info?.message);
                return res.status(401).render('pages/index', {
                    title: 'Login',
                    error: info?.message || 'Credenziali non valide',
                    formData: { username: req.body.username },
                    alertType: 'danger'
                });
            }

            // Verifica rinforzata dell'ID
            const userId = user._id?.toString() || user.id?.toString();
            if (!userId) {
                const errorMsg = 'Oggetto user non valido: manca ID';
                console.error('[500]', errorMsg, user);
                return res.status(500).render('pages/index', {
                    error: 'Errore di configurazione del server',
                    alertType: 'danger'
                });
            }

            // TEST DIRETTO DI SERIALIZZAZIONE (bypassa Passport temporaneamente)
            console.log('\n=== TEST DIRETTO SERIALIZZAZIONE ===');
            req.session.userId = userId;
            req.session.regenerate((err) => {
                if (err) {
                    console.error('Session regeneration failed:', err);
                    return next(err);
                }

                console.log('New session ID:', req.sessionID);
                console.log('Session data:', req.session);

                // Imposta manualmente l'utente autenticato
                req.user = user;
                req.session.passport = { user: userId };

                console.log('\n=== LOGIN SUCCESS (MANUALE) ===');
                console.log('Session post-login:', {
                    id: req.sessionID,
                    data: req.session
                });

                req.session.welcomeMessage = `Benvenuto, ${user.username}!`;
                req.session.save(err => {
                    if (err) {
                        console.error('Session save error:', err);
                        return next(err);
                    }

                    const redirectUrl = user.role === 'admin'
                        ? '/admin'
                        : '/dashboard';

                    console.log(`Redirecting to: ${redirectUrl}`);
                    return res.redirect(redirectUrl);
                });
            });

        } catch (error) {
            console.error('UNEXPECTED ERROR:', error.stack);
            next(error);
        }
    })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/index');
});

module.exports = router;