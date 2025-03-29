const loadRTReviews = require('../services/loadRTReviews');
const connectDB = require('../databases/filmDB');
const uploadRTReviews = async (csvPath) => {
    const connection = await connectDB();
    const RTReview = connection.model('RTReview');

    try {
        const result = await loadRTReviews(csvPath, RTReview);

        return {
            success: result.success,
            insertedCount: result.loaded,
            skipped: result.skipped,
            sample: result.loaded > 0 ? 'Vedi primi record nel DB' : null
        };
    } catch (error) {
        console.error('Error in uploadRTReviews:', error);
        throw error;
    }
};

module.exports = uploadRTReviews;