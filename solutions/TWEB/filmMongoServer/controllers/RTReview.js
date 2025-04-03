const loadRTReviews = require('../services/loadRTReviews');
const connectDB = require('../databases/filmDB');
const uploadRTReviews = async (csvPath) => {
    const connection = await connectDB();
    const RTReview = connection.model('RTReview');

    try {
        // 1. Controllo se esistono documenti nella collection
        const existingCount = await RTReview.countDocuments();
        if (existingCount > 0) {
            return {
                success: false,
                message: "La collection RTReview è già popolata",
                existingCount: existingCount
            };
        }

        // 2. Procedura normale di caricamento (esistente)
        const result = await loadRTReviews(csvPath);

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