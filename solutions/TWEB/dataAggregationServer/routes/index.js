const express = require('express');
const router = express.Router();
const axios = require('axios');
const { createError } = require('http-errors');

// Configurazione servizi esterni
const SERVICES = {
  postgres: process.env.POSTGRES_SERVICE || 'http://localhost:8082',
  mongo: process.env.MONGO_SERVICE || 'http://localhost:3002'
};

//usa curl "http://localhost:3003/api/carousel?limit=15"
router.get('/carousel', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 15, 20); // Aumentato a 15 di default

    // 1. Recupera film valutati da MongoDB
    const { data: ratedFilms } = await axios.get(`${SERVICES.mongo}/api/films/ratings`, {
      params: {
        minRating: 3.5,
        maxRating: 5,
        limit: limit
      },
      timeout: 3000
    });

    if (!ratedFilms?.length) return res.json([]);

    // 2. Recupera solo poster e titoli da PostgreSQL
    const filmIds = ratedFilms.map(film => film.id);
    const { data: filmPosters } = await axios.post(
        `${SERVICES.postgres}/api/films/posters`,
        { ids: filmIds },
        { timeout: 10000 }
    );

    // 3. Combina e formatta i dati
    const carouselData = ratedFilms.map(ratedFilm => {
      const posterData = filmPosters.find(p => p.id === ratedFilm.id) || {};
      return {
        id: ratedFilm.id,
        title: posterData.name || 'Titolo non disponibile',
        posterUrl: posterData.posterLink || '/default-poster.jpg',
        rating: ratedFilm.rating
      };
    });

    // 4. Ordina per rating
    carouselData.sort((a, b) => b.rating - a.rating);

    res.set('Cache-Control', 'public, max-age=3600');
    res.json(carouselData);
  } catch (error) {
    console.error('Aggregation error:', error);
    next(createError(502, 'Service temporarily unavailable'));
  }
});

// Route per i dettagli completi del film
router.get('/films/:id', async (req, res, next) => {
  try {
    const filmId = parseInt(req.params.id);
    if (isNaN(filmId)) {
      return res.status(400).json({ error: "ID film non valido" });
    }

    // Chiamate parallele ai due servizi
    const [postgresResponse, mongoResponse] = await Promise.all([
      axios.get(`${SERVICES.postgres}/api/films/${filmId}`, { timeout: 5000 })
          .catch(err => ({ data: null })),
      axios.get(`${SERVICES.mongo}/api/films/${filmId}`, { timeout: 3000 })
          .catch(err => ({ data: { rating: null } }))
    ]);

    // Verifica disponibilità servizi
    if (!postgresResponse.data) {
      return res.status(502).json({ error: "Servizio PostgreSQL non disponibile" });
    }

    // Combina i risultati
    const response = {
      ...postgresResponse.data,
      rating: mongoResponse.data?.rating
    };

    res.json(response);

  } catch (error) {
    console.error('Film details aggregation error:', error);
    next(createError(500, 'Internal server error'));
  }
});

module.exports = router;