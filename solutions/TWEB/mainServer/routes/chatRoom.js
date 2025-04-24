var express = require('express');
var router = express.Router();
const axios = require('axios');

// Nuova route per SPA
router.get('/chat/view', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
        if (!req.session.user) {
            return res.status(401).send('<div class="alert alert-warning">Devi effettuare il login per accedere alla chat</div>');
        }

        // Renderizza la pagina della chat come stringa
        const chatHtml = await new Promise((resolve, reject) => {
            res.app.render('pages/chat-page', {
                user: req.session.user,
                activeRooms: [],
                currentRoom: null,
                layout: false // Importante: non usare il layout
            }, (err, html) => {
                if (err) reject(err);
                else resolve(html);
            });
        });

        // Aggiungi i dati della chat come script
        const [activeRooms, currentRoom] = await Promise.all([
            getActiveChatRooms(),
            getCurrentUserRoom(req.session.user.id)
        ]);

        const chatDataScript = `
            <script id="chatData" type="application/json">
                ${JSON.stringify({
            user: req.session.user,
            rooms: activeRooms || [],
            currentRoom: currentRoom || null
        })}
            </script>
        `;

        // Invia la chat come HTML o come JSON in base alla richiesta
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            res.send(chatHtml + chatDataScript);
        } else {
            res.render('pages/index', {
                showCarousel: false,
                showSearchResults: false,
                showChat: true,
                chatContent: chatHtml + chatDataScript
            });
        }

    } catch (error) {
        console.error('Chat view error:', error.message);
        const errorHtml = `<div class="alert alert-danger">Errore durante il caricamento della chat: ${error.message}</div>`;

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            res.status(500).send(errorHtml);
        } else {
            res.render('pages/index', {
                showCarousel: false,
                showSearchResults: false,
                showChat: true,
                chatContent: errorHtml
            });
        }
    }
});

async function getActiveChatRooms() {
    try {
        const response = await axios.get(`${DATA_AGGREGATION_SERVER}/api/chat/rooms`, {
            timeout: 5000
        });
        return response.data.map(room => ({
            id: `${room.type}:${room.entityId}`,
            type: room.type,
            name: room.name,
            userCount: room.activeUsers,
            active: false // Gestito client-side
        }));
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return []; // Fallback vuoto
    }
}

async function getCurrentUserRoom(userId) {
    if (!userId) return null;

    try {
        const response = await axios.get(`${DATA_AGGREGATION_SERVER}/api/chat/user/${userId}/room`, {
            timeout: 3000
        });
        return response.data ? {
            id: `${response.data.type}:${response.data.entityId}`,
            name: response.data.name,
            messages: response.data.messages.map(msg => ({
                user: { id: msg.userId, name: msg.userName },
                text: msg.text,
                time: new Date(msg.timestamp).toLocaleTimeString(),
                isCurrentUser: msg.userId === userId
            }))
        } : null;
    } catch (error) {
        console.error('Error fetching user room:', error);
        return null;
    }
}

// Helper function per la chat (aggiungere alle altre funzioni helper)
async function renderChatView(req) {
    if (!req.session.user) return '';

    try {
        const [activeRooms, currentRoom] = await Promise.all([
            getActiveChatRooms(),
            getCurrentUserRoom(req.session.user.id)
        ]);

        // Aggiungi elemento chatData per il client
        const chatDataScript = `
            <script id="chatData" type="application/json">
                ${JSON.stringify({
            user: req.session.user,
            rooms: activeRooms || [],
            currentRoom: currentRoom || null
        })}
            </script>
        `;

        const chatHtml = await new Promise((resolve, reject) => {
            req.app.render('pages/chat-page', {
                user: req.session.user,
                activeRooms: activeRooms || [],
                currentRoom: currentRoom || null
            }, (err, html) => err ? reject(err) : resolve(html));
        });

        return chatHtml + chatDataScript;
    } catch (error) {
        console.error('Error rendering chat:', error);
        return '<div class="alert alert-danger">Errore nel caricamento della chat</div>';
    }
}