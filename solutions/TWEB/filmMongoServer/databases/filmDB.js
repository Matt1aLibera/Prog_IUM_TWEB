const mongoose = require('mongoose');
const FilmRating = require('../models/FilmRating');
const RTReview = require('../models/RTReview');

let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection) {
        return cachedConnection;
    }

    try {
        const conn = await mongoose.connect('mongodb://localhost:27017/filmDB', {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            maxPoolSize: 100,
        });

        // Registra i modelli PRIMA di restituire la connessione
        conn.model('FilmRating', FilmRating.schema);
        conn.model('RTReview', RTReview.schema);

        cachedConnection = conn;
        console.log('✅ Connesso a MongoDB');
        return conn;
    } catch (error) {
        console.error('❌ Errore connessione DB:', error);
        throw error;
    }
};

module.exports = connectDB;