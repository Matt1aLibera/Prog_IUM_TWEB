const fs = require('fs');
const csv = require('csv-parser');
/**
 * Parses CSV file into JSON array, filtering invalid records
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} Resolves with valid records
 */
const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const validRecords = [];
        let skippedRecords = 0;

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                try {
                    const movieId = parseInt(row.id);
                    const rating = parseFloat(row.rating);

                    // Filtra i record non validi
                    if (isNaN(movieId)) throw new Error(`Invalid movie_id: ${row.id}`);
                    if (isNaN(rating)) throw new Error(`Invalid rating: ${row.rating}`);

                    validRecords.push({
                        movie_id: movieId,
                        rating: rating
                    });
                } catch (error) {
                    skippedRecords++;
                    console.log(`⏩ Skipped record: ${error.message}`);
                }
            })
            .on('end', () => {
                console.log(`✅ CSV processed. Valid: ${validRecords.length}, Skipped: ${skippedRecords}`);
                resolve(validRecords);
            })
            .on('error', reject);
    });
};

module.exports = { parseCSV };