const express = require('express');
const router = express.Router();
const axios = require('axios');
const { createError } = require('http-errors');

// Configurazione servizi esterni
const SERVICES = {
  postgres: process.env.POSTGRES_SERVICE || 'http://localhost:8082',
  mongo: process.env.MONGO_SERVICE || 'http://localhost:3002',
  aggregation: process.env.AGGREGATION_SERVICE || 'http://localhost:3003' // Aggiunto
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
      timeout: 6000
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
router.get('/film/:id', async (req, res, next) => {
  try {
    const filmId = parseInt(req.params.id);
    if (isNaN(filmId)) {
      return res.status(400).json({ error: "ID film non valido" });
    }

    // Chiamate parallele ai due servizi
    const [postgresResponse, mongoResponse] = await Promise.all([
      axios.get(`${SERVICES.postgres}/api/films/${filmId}`, { timeout: 10000 })
          .catch(err => ({ data: null })),
      axios.get(`${SERVICES.mongo}/api/films/${filmId}`, { timeout: 6000 })
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

///usa powershell:$query = [System.Uri]::EscapeDataString("Twin Peaks")
// Invoke-RestMethod -Uri "http://localhost:3003/api/films/search/full?q=$query"
// Nuova route per la ricerca completa
router.get('/films/search/full', async (req, res, next) => {
  try {
    const { q, page = 0, size = 15 } = req.query;

    // Converti la pagina in numero (Spring si aspetta page 0-based)
    const pageNumber = Math.max(0, parseInt(page));
    const pageSize = parseInt(size);

    if (!q || q.length < 2) {
      return res.json({
        content: [],
        pageable: {
          pageNumber: pageNumber,
          pageSize: pageSize,
          offset: pageNumber * pageSize
        },
        totalElements: 0
      });
    }

    const { data } = await axios.get(
        `${SERVICES.postgres}/api/films/search/full?q=${encodeURIComponent(q)}&page=${pageNumber}&size=${pageSize}`,
        { timeout: 15000 }
    );

    res.json({
      content: data.content,
      pageable: {
        pageNumber: data.pageable.pageNumber,
        pageSize: data.pageable.pageSize,
        offset: data.pageable.offset
      },
      totalElements: data.totalElements
    });

  } catch (error) {
    console.error('Full search error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: error.response?.data || error.message
    });
  }
});

router.get('/films/search/autocomplete', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const { data } = await axios.get(
        `${SERVICES.postgres}/api/films/search/autocomplete?q=${encodeURIComponent(q)}`,
        { timeout: 15000 }
    );

    res.json(data || []);

  } catch (error) {
    console.error('Autocomplete error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;