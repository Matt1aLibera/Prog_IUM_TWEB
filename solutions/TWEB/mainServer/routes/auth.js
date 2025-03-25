const express = require('express');
const passport = require('passport');
const { createUser } = require('../models/userModel');

const router = express.Router();

// Pagina login
router.get('/login', (req, res) => res.render('pages/login'));

// Pagina registrazione
router.get('/register', (req, res) => res.render('pages/register'));

// Gestione login
router.post('/login', passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/login'
}));

// Gestione registrazione
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    await createUser(username, password);
    res.redirect('/login');
});

// Logout
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

module.exports = router;