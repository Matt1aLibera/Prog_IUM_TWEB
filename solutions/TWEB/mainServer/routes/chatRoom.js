const express = require('express');
const router = express.Router();
const axios = require('axios');

// Configurazione
const CHAT_SERVER_URL = 'http://localhost:3001'; // URL del server chat

// Route principale per la chat SPA
router.get('/chat/view', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('<div class="alert alert-warning">Login required</div>');
    }

    try {
        const activeRooms = await getActiveChatRooms();
        res.render('pages/chat-page', {
            user: req.session.user,
            activeRooms,
            chatDataJson: JSON.stringify({
                user: req.session.user // Invia solo i dati necessari
            }),
            layout: false
        });
    } catch (error) {
        res.status(500).send(`<div class="alert alert-danger">Error: ${error.message}</div>`);
    }
});
// Helper per ottenere le stanze attive dal server chat
async function getActiveChatRooms() {
    try {
        const response = await axios.get(`${CHAT_SERVER_URL}/chat/getRooms`, {
            timeout: 5000
        });

        return response.data.rooms.map(room => ({
            id: room._id, // Usa l'ID MongoDB
            name: room.name,
            topic: room.topic,
            createdAt: room.createdAt,
            active: false // Gestito lato client
        }));
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return []; // Fallback vuoto
    }
}

router.get('/active-rooms', async (req, res) => {
    try {
        const rooms = await Room.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.json(rooms.map(room => ({
            id: room._id,
            name: room.name,
            type: room.type,
            userCount: 0 // Aggiornato dal server socket
        })));
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero stanze" });
    }
});

module.exports = router;