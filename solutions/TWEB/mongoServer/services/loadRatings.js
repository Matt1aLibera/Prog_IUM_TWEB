const fs = require('fs');
const csv = require('csv-parser');
const  FilmRating = require('../models/filmRating');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../csv/movies.csv'); // Percorso corretto

const loadRatings = async () => {
    console.log('🔄 Avvio caricamento da:', CSV_PATH);

    try {
        const stats = fs.statSync(CSV_PATH);
        console.log(`📄 Dimensione file CSV: ${stats.size} bytes`);

        const results = [];
        let rowCount = 0;

        await new Promise((resolve, reject) => {
            fs.createReadStream(CSV_PATH)
                .pipe(csv())
                .on('data', (row) => {
                    rowCount++;
                    if (rowCount % 1000 === 0) console.log(`➡️ Processate ${rowCount} righe`);
                    results.push({
                        movie_id: parseInt(row.id),
                        rating: parseFloat(row.rating)
                    });
                })
                .on('end', () => {
                    console.log(`✅ Totale righe processate: ${rowCount}`);
                    resolve();
                })
                .on('error', reject);
        });

        console.log('🗑️ Svuotamento collezione FilmRating...');
        await FilmRating.deleteMany({});
        console.log('📥 Inserimento nuovi documenti...');
        const insertResult = await FilmRating.insertMany(results);

        return {
            success: true,
            count: insertResult.length,
            firstId: insertResult[0]?.movie_id // ID primo documento
        };
    } catch (error) {
        console.error('💥 ERRORE CRITICO:', error);
        throw error;
    }
};

module.exports = loadRatings;