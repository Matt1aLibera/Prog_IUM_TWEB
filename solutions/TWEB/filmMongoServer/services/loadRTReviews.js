const csv = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const RTReview = require('../models/RTReview');

// services/rtReviewsService.js
const parseRTReviewsCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const batchSize = 1000;
        let batch = [];
        let validCount = 0;
        let skippedCount = 0;

        const stream = fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                try {
                    // Validazione più permissiva
                    if (!row['rotten_tomatoes_link']) {
                        throw new Error('Manca rotten_tomatoes_link');
                    }

                    const review = {
                        rotten_tomatoes_link: row['rotten_tomatoes_link'],
                        movie_title: row['movie_title'] || null,
                        critic_name: row['critic_name'] || row['critic'] || 'Anonimo', // Campo alternativo
                        top_critic: (row['top_critic'] || '').toUpperCase() === 'Y',
                        publisher_name: row['publisher_name'] || null,
                        review_type: row['review_type'] || 'Rotten',
                        review_score: row['review_score'] || null,
                        review_date: row['review_date'] ? new Date(row['review_date']) : null,
                        review_content: row['review_content'] || null
                    };

                    batch.push(review);
                    validCount++;

                    if (batch.length >= batchSize) {
                        stream.pause();
                        processBatch(batch).then(() => stream.resume());
                        batch = [];
                    }
                } catch (error) {
                    skippedCount++;
                    console.log(`⏩ Skipped: ${error.message} (${row['movie_title'] || 'N/A'})`);
                }
            })
            .on('end', async () => {
                if (batch.length > 0) {
                    await processBatch(batch);
                }
                resolve({ validCount, skippedCount });
            })
            .on('error', reject);

        async function processBatch(batchData) {
            try {
                await RTReview.insertMany(batchData, { ordered: false });
            } catch (error) {
                console.error('Errore batch:', error.message);
            }
        }
    });
};

const loadRTReviews = async (filePath) => {
    const batchSize = 1000;
    let batch = [];
    let validCount = 0;
    let skippedCount = 0;

    try {
        await new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', async (row) => {
                    try {
                        if (!row['rotten_tomatoes_link']) {
                            throw new Error('Missing rotten_tomatoes_link');
                        }

                        batch.push({
                            rotten_tomatoes_link: row['rotten_tomatoes_link'],
                            movie_title: row['movie_title'] || null,
                            critic_name: row['critic_name'] || row['critic'] || 'Anonymous',
                            top_critic: (row['top_critic'] || '').toUpperCase() === 'Y',
                            publisher_name: row['publisher_name'] || null,
                            review_type: row['review_type'] || 'Rotten',
                            review_score: row['review_score'] || null,
                            review_date: row['review_date'] ? new Date(row['review_date']) : null,
                            review_content: row['review_content'] || null
                        });
                        validCount++;

                        if (batch.length >= batchSize) {
                            stream.pause();
                            await processBatch([...batch]);
                            batch = [];
                            stream.resume();
                        }
                    } catch (error) {
                        skippedCount++;
                        console.log(`⏩ Skipped: ${error.message}`);
                    }
                })
                .on('end', async () => {
                    if (batch.length > 0) {
                        await processBatch(batch);
                    }
                    resolve({ validCount, skippedCount });
                })
                .on('error', reject);

            async function processBatch(batchData) {
                try {
                    await RTReview.insertMany(batchData, { ordered: false });
                } catch (error) {
                    console.error('Batch error:', error.message);
                }
            }
        });

        return {
            success: true,
            loaded: validCount,
            skipped: skippedCount
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            loaded: validCount,
            skipped: skippedCount
        };
    }
};

module.exports = loadRTReviews;