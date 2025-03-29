const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const filmRatingSchema = new Schema({
    movie_id: {
        type: Number,  // ID numerico semplice
        required: true,
        index: true
    },
    rating: {
        type: Number,  // Numero con virgola
        required: true,
        min: 0,
        max: 5
    },
    },
    {collection: 'filmRatings'}
);

module.exports = mongoose.model('FilmRating', filmRatingSchema);