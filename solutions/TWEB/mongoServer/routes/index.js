const express = require('express');
const router = express.Router();
const { verify } = require('../controllers/auth');
const { id } = require('../controllers/user');

// POST /auth/verify - Verifica le credenziali
router.post('/verify', verify);
// endpoint per la deserializzazione
router.get('/user/:id', id);

module.exports = router;