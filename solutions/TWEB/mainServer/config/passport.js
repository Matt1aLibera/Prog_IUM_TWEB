javascript
Copy
const passport = require('passport');

// Disabilita la serializzazione
passport.serializeUser((user, done) => {
    done(null, {}); // Non salva nulla nella sessione
});

// Disabilita la deserializzazione
passport.deserializeUser((obj, done) => {
    done(null, {}); // Non carica nulla dalla sessione
});

// (Mantieni la tua strategia 'remote' se ti serve per la validazione)
module.exports = passport;