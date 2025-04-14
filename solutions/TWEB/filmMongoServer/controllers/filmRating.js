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

const getFilmsByRatingRange = async (minRating, maxRating, limit) => {
    const connection = await connectDB();
    const FilmRating = connection.model('FilmRating'); // Ottieni il modello dalla connessione

    try {
        const films = await FilmRating.find({
            rating: { $gte: minRating, $lte: maxRating }
        })
            .select('movie_id rating -_id')
            .sort({ rating: -1 })
            .limit(limit)
            .lean();

        return films.map(film => ({
            id: film.movie_id,
            rating: film.rating
        }));
    } catch (error) {
        console.error('Errore in getFilmsByRatingRange:', error);
        throw error;
    }
};

const getFilmRating = async (movie_id) => {
    const connection = await connectDB();
    const FilmRating = connection.model('FilmRating');
    try {
        const doc = await FilmRating.findOne({ movie_id });
        if (!doc) {
            return {
                success: false,
                message: "Film non trovato"
            };
        }
        return {
            success: true,
            rating: doc.rating
        };
    } catch (error) {
        console.error('Errore recupero rating:', error);
        throw error;
    }
};

module.exports = {
    upsertRating,
    getRating,
    uploadRatings, // Aggiungi la nuova funzione
    getFilmsByRatingRange,
    getFilmRating,
};