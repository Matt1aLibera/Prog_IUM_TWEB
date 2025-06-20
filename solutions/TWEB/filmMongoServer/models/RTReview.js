const mongoose = require('mongoose');
/**
 * Schema for Rotten Tomatoes reviews with normalized ratings
 */
const RTReviewSchema = new mongoose.Schema({
    rotten_tomatoes_link: String,
    movie_title: String,
    critic_name: String,
    top_critic: Boolean,
    publisher_name: String,
    review_type: String,
    review_score: String,
    normalized_score: Number,  // Nuovo campo normalizzato
    review_date: Date,
    review_content: String
}, { collection: 'rt_reviews' });
/**
 * Creates indexes for optimized movie and score queries
 */
RTReviewSchema.index({ movie_title: 1, normalized_score: -1 });
RTReviewSchema.index({ normalized_score: -1 });

module.exports = mongoose.model('RTReview', RTReviewSchema);