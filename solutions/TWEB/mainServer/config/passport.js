const passport = require('mainServer/config/passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { getUserByUsername, getUserById } = require('../models/userModel');

// Strategia di autenticazione locale
passport.use(new LocalStrategy(async (username, password, done) => {
    const user = await getUserByUsername(username);
    if (!user) return done(null, false, { message: 'Utente non trovato' });
    if (!bcrypt.compareSync(password, user.password)) return done(null, false, { message: 'Password errata' });
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await getUserById(id);
    done(null, user);
});

module.exports = passport;