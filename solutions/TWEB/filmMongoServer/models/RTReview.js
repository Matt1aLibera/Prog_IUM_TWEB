const mongoose = require('mongoose');

const RTReviewSchema = new mongoose.Schema({
    rotten_tomatoes_link: String, // rotten_tomatoes_link (es. "m/0814255")
    movie_title: String,
    critic_name: String,
    top_critic: Boolean, // true/false invece di "Y"/"N"
    publisher_name: String,
    review_type: String, // "Fresh" o "Rotten" (senza enum)
    review_score: String, // Mantieni come stringa (es. "3.5/5")
    review_date: Date,
    review_content: String
}, { collection: 'rt_reviews' });

module.exports = mongoose.model('RTReview', RTReviewSchema);