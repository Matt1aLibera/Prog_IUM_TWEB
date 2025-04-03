const connectDB = require('../databases/filmDB');
const { parseCSV } = require('../services/loadRatings');
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
const uploadRatings = async (csvPath) => {
    const connection = await connectDB();
    const FilmRating = connection.model('FilmRating');

    try {
        // 1. Controllo se esistono documenti nella collection
        const existingCount = await FilmRating.countDocuments();
        if (existingCount > 0) {
            return {
                success: false,
                message: "La collection FilmRating è già popolata",
                existingCount: existingCount
            };
        }

        // 2. Procedura normale di caricamento (esistente)
        const data = await parseCSV(csvPath);
        if (data.length === 0) {
            return {
                success: false,
                message: "Nessun dato valido trovato nel CSV"
            };
        }

        const results = await FilmRating.insertMany(data, { ordered: false });

        return {
            success: true,
            insertedCount: results.length,
            sample: results.slice(0, 3)
        };
    } catch (error) {
        console.error('Error in uploadRatings:', error);
        throw error;
    }
};



module.exports = {
    upsertRating,
    getRating,
    uploadRatings, // Aggiungi la nuova funzione
};