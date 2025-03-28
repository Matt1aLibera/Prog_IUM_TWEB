//const FilmRating = require('../models/filmRating');
const { User, FilmRating } = require('../databases/mongo');
const loadRatings = require('../services/loadRatings');
// Crea/aggiorna rating
const upsertRating = async (movie_id, rating) => {
    try {
        await FilmRating.findOneAndUpdate(
            { movie_id },
            { rating },
            { upsert: true, new: true } // Crea se non esiste
        );
        return true;
    } catch (error) {
        console.error('Errore salvataggio rating:', error);
        return false;
    }
};

// Recupera rating
const getRating = async (movie_id) => {
    try {
        const doc = await FilmRating.findOne({ movie_id });
        return doc ? doc.rating : null;
    } catch (error) {
        console.error('Errore recupero rating:', error);
        return null;
    }
};

// Nuova funzione per il caricamento del DB
const uploadDB = async () => {
    console.log('🏁 Richiesta caricamento DB ricevuta');
    const result = await loadRatings();
    console.log('🎉 Caricamento completato:', result);
    return result;
};

module.exports = {
    upsertRating,
    getRating,
    uploadDB // Aggiungi la nuova funzione
};