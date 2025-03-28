const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const filmRatingSchema = new Schema({
    movie_id: {
        type: Number,  // ID numerico semplice
        required: true
    },
    rating: {
        type: Number,  // Numero con virgola
        required: true
    }
});

// Crea indice sull'ID per performance
filmRatingSchema.index({ movie_id: 1 });

module.exports = mongoose.model('FilmRating', filmRatingSchema);