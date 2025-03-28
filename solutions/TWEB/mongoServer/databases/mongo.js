const mongoose = require('mongoose');

// Configurazioni comuni per tutte le connessioni
const connectionOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    checkServerIdentity: false
};

// Connessione al database UserDB
const userDBConnection = mongoose.createConnection('mongodb://localhost:27017/UserDB', {
    ...connectionOptions,
    appName: 'UserDB-Connection'
});

// Connessione al database FilmDB
const filmDBConnection = mongoose.createConnection('mongodb://localhost:27017/FilmDB', {
    ...connectionOptions,
    appName: 'FilmDB-Connection'
});

// Gestione eventi per UserDB
userDBConnection.on('connected', () => {
    console.log('✅ Connesso a UserDB su:', userDBConnection.host);
    console.log('🎯 Database selezionato:', userDBConnection.name);
});

userDBConnection.on('error', (err) => {
    console.error('❌ Errore UserDB:', err.message);
});

// Gestione eventi per FilmDB
filmDBConnection.on('connected', () => {
    console.log('✅ Connesso a FilmDB su:', filmDBConnection.host);
    console.log('🎯 Database selezionato:', filmDBConnection.name);
});

filmDBConnection.on('error', (err) => {
    console.error('❌ Errore FilmDB:', err.message);
});

// Funzioni per verificare lo stato
const checkConnections = () => {
    return {
        userDB: userDBConnection.readyState === 1 ? 'connected' : 'disconnected',
        filmDB: filmDBConnection.readyState === 1 ? 'connected' : 'disconnected'
    };
};

// Chiude tutte le connessioni (utile per i test)
const closeAllConnections = async () => {
    await userDBConnection.close();
    await filmDBConnection.close();
};

module.exports = {
    // Connessioni
    userDBConnection,
    filmDBConnection,

    // Modelli (registrati sulle rispettive connessioni)
    User: userDBConnection.model('User', require('../models/user')),
    FilmRating: filmDBConnection.model('FilmRating', require('../models/filmRating')),

    // Utility
    checkConnections,
    closeAllConnections,

    // Mongoose originale (per eventuali esigenze particolari)
    mongoose
};