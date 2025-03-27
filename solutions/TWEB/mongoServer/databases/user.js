const mongoose = require('mongoose');
const User = require('../models/User'); // Importa il modello User

const mongoDB = 'mongodb://localhost:27017/UserDB'; // Consiglio di usare filmsDB invece di user

const connectDB = async () => {
    try {
        await mongoose.connect(mongoDB, {
            checkServerIdentity: false,
        });
        console.log('✅ Connessione a MongoDB riuscita!');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ Connessione a MongoDB fallita:', error);
        throw error; // Rilancia l'errore per gestirlo a livello superiore
    }
};

// Esporta sia la connessione che il modello User
module.exports = {
    connectDB,
    User,
    connection: mongoose.connection // Esporta la connessione diretta se serve
};