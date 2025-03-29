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
        const data = await parseCSV(csvPath);

        if (data.length === 0) {
            return {
                success: false,
                message: "Nessun dato valido trovato nel CSV"
            };
        }

        // Inserimento con ulteriore validazione
        const results = await FilmRating.insertMany(data, { ordered: false });

        return {
            success: true,
            insertedCount: results.length,
            sample: results.slice(0, 3)
        };
    } catch (error) {
        console.error('Error in uploadDB:', error);
        throw error;
    }
};

//non questo
const loadRatings = async (csvData) => {
    try {
        // Svuota la collezione
        await FilmRating.deleteMany({});

        // Inserisci i nuovi dati
        const results = await FilmRating.insertMany(csvData);

        return {
            success: true,
            count: results.length,
            sample: results.slice(0, 3)
        };
    } catch (error) {
        console.error('Errore nel controller:', error);
        throw error;
    }
};

module.exports = {
    upsertRating,
    getRating,
    uploadRatings, // Aggiungi la nuova funzione
    loadRatings
};