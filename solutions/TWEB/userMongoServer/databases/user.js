const mongoose = require('mongoose');
const User = require('../models/User'); // Importa il modello User

const userDB = 'mongodb://localhost:27017/UserDB'; // Consiglio di usare filmsDB invece di user
/**
 * MongoDB connection for user authentication
 */
const connectUserDB = async () => {
    try {
        await mongoose.connect(userDB, {
            checkServerIdentity: false,
        });
        console.log('✅ Connessione a MongoDB riuscita!');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ Connessione a MongoDB fallita:', error);
        throw error;
    }
};

// Esporta sia la connessione che il modello User
module.exports = {
    connectUserDB,
    User
};