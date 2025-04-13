const express = require('express');
const router = express.Router();
const axios = require('axios');
const { createError } = require('http-errors');

// Configurazione servizi esterni
const SERVICES = {
  postgres: process.env.POSTGRES_SERVICE || 'http://localhost:8082',
  mongo: process.env.MONGO_SERVICE || 'http://localhost:3002'
};

// Route per il carosello
router.get('/carousel', async (req, res, next) => {
  try {
    // Validate limit parameter
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    // 1. Get rated films from MongoDB
    const { data: ratedFilms } = await axios.get(`${SERVICES.mongo}/api/films/ratings`, {
      params: {
        minRating: 3.5,
        maxRating: 5,
        limit: limit
      },
      timeout: 3000
    });

    if (!ratedFilms?.length) {
      return res.json([]);
    }

    // 2. Get film details from PostgreSQL
    const filmIds = ratedFilms.map(film => film.id);
    const { data: filmDetails } = await axios.post(
        `${SERVICES.postgres}/api/films/batch`,
        { ids: filmIds },
        { timeout: 10000 }
    );

    // 3. Combine and format data
    const combinedData = ratedFilms.map(ratedFilm => {
      const detail = filmDetails.find(d => d.id === ratedFilm.id) || {};
      return {
        id: ratedFilm.id,
        title: detail.name || 'Titolo non disponibile',
        poster: detail.posterLink || '/default-poster.jpg',
        year: detail.date,
        description: detail.description,
        tagline: detail.tagline,
        rating: ratedFilm.rating,
        actors: detail.actors || [],
        countries: detail.countries || [],
        duration: detail.minute ? `${Math.floor(detail.minute / 60)}h ${detail.minute % 60}m` : null
      };
    });

    // 4. Sort by rating (descending)
    combinedData.sort((a, b) => b.rating - a.rating);

    // Cache control headers
    res.set('Cache-Control', 'public, max-age=3600');

    res.json(combinedData);
  } catch (error) {
    console.error('Aggregation error:', {
      message: error.message,
      service: error.config?.url,
      response: error.response?.data
    });

    const statusCode = error.response?.status || 502;
    next(createError(statusCode, 'Errore durante l\'aggregazione dei dati', {
      service: error.config?.url,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

module.exports = router;