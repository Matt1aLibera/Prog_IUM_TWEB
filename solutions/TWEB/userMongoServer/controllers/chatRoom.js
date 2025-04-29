const mongoose = require('mongoose');
const { connectDB, ChatRoom } = require('../databases/chatRoom');

// Middleware ottimizzato
const ensureDBConnection = async (req, res, next) => {
    try {
        const conn = await connectDB();
        req.chatConnection = conn; // Aggiunge la connessione alla request
        next();
    } catch (error) {
        console.error('Errore connessione ChatDB:', error);
        res.status(500).json({
            success: false,
            error: 'Database chat non disponibile',
            details: error.message
        });
    }
};

// Crea una nuova chat
exports.createRoom = [
    ensureDBConnection,
    async (req, res) => {
        try {
            const { name, topic, code } = req.body; // <-- Aggiungi code

            if (!name || !topic || !code) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome, topic e codice sono obbligatori'
                });
            }

            const room = new ChatRoom({ name, topic, code }); // <-- Includi code
            await room.save();

            res.status(201).json({
                success: true,
                room: {
                    id: room._id,
                    code: room.code, // <-- Includi nel response
                    name: room.name,
                    topic: room.topic
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Errore creazione room',
                details: error.message
            });
        }
    }
];

// Lista di tutte le chat
exports.getRooms = [
    ensureDBConnection,
    async (req, res) => {
        try {
            const rooms = await ChatRoom.find()
                .select('name topic createdAt')
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                success: true,
                db: 'chatRoomDB', // Per debug
                count: rooms.length,
                rooms
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Errore recupero rooms',
                details: error.message
            });
        }
    }
];

// Elimina una chat
exports.deleteRoom = [
    ensureDBConnection,
    async (req, res) => {
        try {
            const { code } = req.params; // <-- Ora usiamo il code invece dell'id

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: 'Codice stanza mancante'
                });
            }

            const result = await ChatRoom.findOneAndDelete({ code: code }); // <-- Cerca per code

            if (!result) {
                return res.status(404).json({
                    success: false,
                    error: 'Stanza non trovata'
                });
            }

            res.json({
                success: true,
                message: 'Stanza eliminata',
                deletedRoom: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Errore eliminazione stanza',
                details: error.message
            });
        }
    }
];