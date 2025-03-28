/*const mongoose = require('mongoose');
const  FilmRating = require('../models/FilmRating'); // Importa il modello User

const filmDB = 'mongodb://localhost:27017/FilmDB'; // Consiglio di usare filmsDB invece di user

const connectFilmDB = async () => {
    try {
        await mongoose.connect(filmDB, {
            useNewUrlParser: true,
            useUnifiedTopology:true,
            checkServerIdentity: false,
        });
        console.log('✅ Connesso a MongoDB su:', mongoose.connection.host);
        console.log('🎯 Database selezionato:', mongoose.connection.name); // Nome del DB
        return mongoose.connection;
    } catch (error) {
        console.error('❌ Connessione a MongoDB fallita:', error.message);
        throw error; // Rilancia l'errore per gestirlo a livello superiore
    }
};

// Esporta sia la connessione che il modello User
module.exports = {
    connectFilmDB,
    FilmRating,
    //connection: mongoose.connection // Esporta la connessione diretta se serve
};
*/
