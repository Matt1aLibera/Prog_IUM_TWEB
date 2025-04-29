const express = require('express');
const router = express.Router();
const { createRoom, getRooms, deleteRoom } = require('../controllers/chatRoom');

router.post('/createRoom', createRoom);    // Crea chat
router.get('/getRooms', getRooms);      // Lista chat
router.delete('/deleteRoom/:code', deleteRoom); // Elimina chat

module.exports = router;