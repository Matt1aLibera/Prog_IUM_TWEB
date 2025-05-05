const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
// Configurazione
const CHAT_SERVER_URL = 'http://localhost:3001'; // URL del server chat

// Route principale per la chat SPA
router.get('/chat', async (req, res) => {
    try {
        const activeRooms = await getActiveChatRooms();

        // Renderizza solo il contenuto della chat per le richieste AJAX
        const chatHtml = await new Promise((resolve, reject) => {
            res.app.render('pages/chat-page', {
                activeRooms,
                chatDataJson: JSON.stringify({}),
                layout: false
            }, (err, html) => {
                if (err) reject(err);
                else resolve(html);
            });
        });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            res.send(chatHtml);
        }
        // Altrimenti renderizza la pagina completa
        else {
            res.render('pages/index', {
                showCarousel: false,
                showSearchResults: false,
                showChat: true,  // Questo renderà visibile la chatSection
                chatContent: chatHtml,
                // Mantieni tutte le altre variabili necessarie al layout
                user: req.user,  // se usi autenticazione
                pageTitle: "Chat"  // o altre meta-info
            });
        }
    } catch (error) {
        const errorHtml = `<div class="alert alert-danger">Error: ${error.message}</div>`;

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            res.status(500).send(errorHtml);
        } else {
            res.render('pages/index', {
                showCarousel: false,
                showSearchResults: false,
                showChat: true,
                chatContent: errorHtml,
                // Mantieni tutte le altre variabili necessarie
                user: req.user,
                pageTitle: "Chat Error"
            });
        }
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

// Route per cancellare una stanza (chiamata da Socket.IO)
router.delete('/chat/deleteRoom/:code', async (req, res) => {
    try {
        // Inoltra la richiesta al MongoDB server
        const response = await axios.delete(`${CHAT_SERVER_URL}/chat/deleteRoom/${req.params.code}`);

        // Restituisci la risposta del MongoDB server al chiamante (Socket.IO)
        res.status(response.status).json(response.data);
    } catch (error) {
        // Gestisci errori di connessione al MongoDB server
        console.error('Errore cancellazione stanza:', error.message);
        res.status(500).json({
            success: false,
            error: 'Errore durante la cancellazione',
            details: error.message
        });
    }
});
module.exports = router;