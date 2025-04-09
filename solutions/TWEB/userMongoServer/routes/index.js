const express = require('express');
const router = express.Router();
const { verify } = require('../controllers/auth');
const { id } = require('../controllers/user');
const { register } = require('../controllers/user');
const { logout } = require('../controllers/user');
// POST /auth/verify - Verifica le credenziali
router.post('/verify', verify);
// endpoint per la deserializzazione
router.get('/user/:id', id);
//endpoint per la registrazione
router.post('/register', register);
//endpoint per il logout
router.get('/logout', logout);

module.exports = router;