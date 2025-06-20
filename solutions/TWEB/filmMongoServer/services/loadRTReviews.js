const csv = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const RTReview = require('../models/RTReview');
/**
 * Loads reviews from CSV to MongoDB with batch processing
 * @param {Model} RTReviewModel - Mongoose model for reviews
 * @param {string} filePath - Path to CSV file
 * @param {Function} processRecord - Record transformation function
 * @param {number} [batchSize=5000] - Insert batch size (default: 5000)
 * @returns {Object} Operation result with counts
 */
const loadRTReviews = async (RTReviewModel, filePath, processRecord, batchSize = 5000) => {
    let processedCount = 0;
    let skippedCount = 0;
    let currentBatch = [];

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', async (row) => {
                    try {
                        if (!row['rotten_tomatoes_link'] || !row['movie_title']) {
                            throw new Error('Missing required fields');
                        }

                        const processed = processRecord({
                            rotten_tomatoes_link: row['rotten_tomatoes_link'],
                            movie_title: row['movie_title'],
                            critic_name: row['critic_name'] || 'Anonymous',
                            top_critic: (row['top_critic'] || '').toLowerCase() === 'true',
                            publisher_name: row['publisher_name'] || null,
                            review_type: row['review_type'] || 'Rotten',
                            review_score: row['review_score'] || null,
                            review_date: row['review_date'] ? new Date(row['review_date']) : null,
                            review_content: row['review_content'] || null
                        });

                        currentBatch.push(processed);
                        processedCount++;

                        if (currentBatch.length >= batchSize) {
                            const batchToInsert = [...currentBatch];
                            currentBatch = [];
                            await RTReviewModel.insertMany(batchToInsert, { ordered: false });
                        }
                    } catch (error) {
                        skippedCount++;
                    }
                })
                .on('end', async () => {
                    if (currentBatch.length > 0) {
                        await RTReviewModel.insertMany(currentBatch, { ordered: false });
                    }
                    resolve();
                })
                .on('error', reject);
        });

        return {
            success: true,
            loaded: processedCount,
            skipped: skippedCount
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            loaded: processedCount,
            skipped: skippedCount
        };
    }
};


module.exports = loadRTReviews;