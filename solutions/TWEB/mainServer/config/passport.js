const passport = require('passport');

// Serializzazione: salva solo l'ID
passport.serializeUser((user, done) => {
    done(null, user._id || user.id);
});

// Deserializzazione: mock fisso (bypass completo)
passport.deserializeUser((id, done) => {
    done(null, {
        _id: id,
        username: 'admin',
        role: 'admin' // Forza ruolo admin per testing
    });
});

module.exports = passport;