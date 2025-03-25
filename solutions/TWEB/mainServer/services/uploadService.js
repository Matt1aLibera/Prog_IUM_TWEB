const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const axios = require('axios');

// Percorso dei file CSV
const DATA_DIR = path.join(__dirname, '../data');

// Funzione principale
async function processCSVFiles() {
    console.log("🔹 Inizio caricamento dati...");

    // Lista dei file CSV nella cartella /data
    const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.csv'));

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        console.log(`📂 Processando file: ${file}`);

        const records = await readCSV(filePath);

        // Separiamo i dati per MongoDB e PostgreSQL
        const { postgresData, mongoData } = splitData(records);

        // Inviamo i dati ai database
        await sendToPostgres(postgresData);
        await sendToMongoDB(mongoData);
    }

    console.log("✅ Caricamento completato!");
}

// **Legge un CSV e restituisce i dati come array di oggetti**
function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const records = [];
        fs.createReadStream(filePath)
            .pipe(parse({ columns: true }))
            .on('data', (row) => records.push(row))
            .on('end', () => resolve(records))
            .on('error', (error) => reject(error));
    });
}

// **Separa i dati in due set: uno per PostgreSQL e uno per MongoDB**
function splitData(records) {
    const postgresData = [];
    const mongoData = [];

    records.forEach(record => {
        const { id, titolo, anno, genere, rating, visualizzazioni } = record;

        // Dati statici per PostgreSQL
        postgresData.push({ id, titolo, anno, genere });

        // Dati dinamici per MongoDB
        mongoData.push({ id, rating, visualizzazioni });
    });

    return { postgresData, mongoData };
}

// **Invia i dati a PostgreSQL tramite il server Spring Boot**
async function sendToPostgres(data) {
    try {
        const response = await axios.post('http://localhost:8080/api/films', data);
        console.log(`🎬 PostgreSQL: ${response.data}`);
    } catch (error) {
        console.error("❌ Errore nell'invio a PostgreSQL:", error.message);
    }
}

// **Invia i dati a MongoDB tramite il server Express**
async function sendToMongoDB(data) {
    try {
        const response = await axios.post('http://localhost:4000/api/films', data);
        console.log(`📊 MongoDB: ${response.data}`);
    } catch (error) {
        console.error("❌ Errore nell'invio a MongoDB:", error.message);
    }
}

module.exports = { processCSVFiles };