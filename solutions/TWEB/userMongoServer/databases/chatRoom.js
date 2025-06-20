const mongoose = require('mongoose');
const ChatRoomSchema = require('../models/ChatRoom').schema;

const chatDB = 'mongodb://localhost:27017/chatRoomDB';
/**
 * Isolated MongoDB connection for chat rooms
 */
// Create separate mongoose instance
const chatConnection = new mongoose.Mongoose(); // Nuova istanza Mongoose isolata

const connectDB = async () => {
    if (chatConnection.connection && chatConnection.connection.readyState === 1) {
        return chatConnection.connection;
    }

    try {
        await chatConnection.connect(chatDB, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        console.log('✅ Connessione ChatDB isolata stabilita');
        return chatConnection.connection;
    } catch (err) {
        console.error('❌ Errore connessione ChatDB:', err);
        throw err;
    }
};

// Register model on isolated connection
const ChatRoom = chatConnection.model('ChatRoom', ChatRoomSchema);

module.exports = {
    connectDB,
    ChatRoom
};