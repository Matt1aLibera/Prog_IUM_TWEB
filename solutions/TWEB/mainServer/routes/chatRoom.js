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
router.post('/chat/createRoom', async (req, res) => {
    try {
        const response = await axios.post(`${CHAT_SERVER_URL}/chat/createRoom`, req.body, {
            timeout: 5000
        });

        // Inoltra la risposta del MongoDB server al client
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Proxy error:', error.message);

        // Gestisci diversi tipi di errori
        if (error.response) {
            // Errore dal MongoDB server
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // Nessuna risposta dal MongoDB server
            res.status(503).json({
                success: false,
                error: 'Il servizio chat non è al momento disponibile'
            });
        } else {
            // Altri errori
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
});


router.get('/chat/active-rooms', async (req, res) => {
    try {
        const response = await axios.get(`${CHAT_SERVER_URL}/chat/getRooms`, {
            timeout: 5000
        });

        // Estrai l'array rooms dalla risposta
        const roomsData = response.data.rooms || []; // <-- Modifica chiave qui

        // Mappa i dati
        const rooms = roomsData.map(room => ({
            id: room._id,
            name: room.name,
            type: room.topic, // Usa topic come type
            userCount: 0
        }));

        res.json(rooms); // Invia direttamente l'array
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({
            error: "Errore nel recupero stanze",
            details: error.message
        });
    }
});

module.exports = router;