const createError = require('http-errors');
const express = require('express');
const router = express.Router();
const axios = require('axios');

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
router.get('/films/:id', async (req, res, next) => {
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

router.post('/oscars/search', async (req, res) => {
  try {
    const { filmName, year } = req.body;

    // 1. Chiamata al Postgres Server (già testata con curl)
    const response = await axios.get(`${SERVICES.postgres}/api/oscars/search`, {
      params: { filmName, year }
    });

    // 2. Formatta la risposta (opzionale)
    const formattedOscars = response.data.map(oscar => ({
      category: oscar.category,
      year: oscar.yearCeremony,
      isWinner: oscar.winner,
      nominee: oscar.name
    }));

    res.json(formattedOscars);
  } catch (error) {
    res.status(500).json({ error: "Errore nel fetch degli Oscar" });
  }
});

/**
 * @api {get} /films/:title/reviews Recupera recensioni filtrate
 * @apiName GetFilmReviews
 * @apiGroup Aggregation
 *
 * @apiParam {String} title Titolo del film (URL-encoded)
 * @apiQuery {Number} [limit=10] Numero di risultati
 * @apiQuery {Number} [offset=0] Offset paginazione
 * @apiQuery {Number} [minRating] Filtro rating minimo (0-5)
 * @apiQuery {Number} [maxRating] Filtro rating massimo (0-5)
 */
router.get('/films/:title/reviews', async (req, res, next) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const { limit = 10, offset = 0, minRating, maxRating } = req.query;

    // Validazione parametri
    const params = {
      limit: Math.min(parseInt(limit), 50), // Massimo 50 risultati
      offset: Math.max(0, parseInt(offset))
    };

    if (minRating) params.minRating = parseFloat(minRating);
    if (maxRating) params.maxRating = parseFloat(maxRating);

    // Chiamata al Mongo Server
    const { data } = await axios.get(`${SERVICES.mongo}/api/films/${encodeURIComponent(title)}/reviews`, {
      params,
      timeout: 16000
    });

    // Formattazione risposta (opzionale)
    const response = {
      reviews: data.reviews.map(r => ({
        id: r._id,
        critic: r.critic_name,
        publisher: r.publisher_name,
        score: r.normalized_score,
        date: r.review_date,
        content: r.review_content,
        isFresh: r.review_type === 'Fresh'
      })),
      pagination: data.pagination,
      stats: data.stats
    };

    res.json(response);

  } catch (error) {
    console.error('[Aggregation] Reviews error:', error.message);

    if (error.response) {
      // Propagazione errori dal Mongo Server
      res.status(error.response.status).json(error.response.data);
    } else {
      next(createError(502, 'MongoDB service unavailable'));
    }
  }
});

router.get('/advanced-search', async (req, res) => {
  console.log('DAS - Parametri ricevuti:', req.query);

  try {
    const { searchType, minRating = 0, sortBy, ...params } = req.query;
    const minRatingNum = parseFloat(minRating);

    if (searchType === 'films') {
      // 1. Recupera i film da Postgres
      const postgresParams = {
        title: params.filmQuery,
        actor: params.searchType === 'actor' ? params.searchQuery : undefined,
        character: params.searchType === 'character' ? params.searchQuery : undefined,
        crew: params.searchType === 'crew' ? params.searchQuery : undefined,
        studio: params.searchType === 'studio' ? params.searchQuery : undefined,
        genres: params.genres?.split(','),
        yearFrom: params.yearFrom,
        yearTo: params.yearTo,
        oscarStatus: params.oscarStatus
      };

      console.log('DAS - Invio a Postgres:', postgresParams);
      const postgresResponse = await axios.get(`${SERVICES.postgres}/api/films/advanced-search`, {
        params: postgresParams,
        timeout: 10000
      });

      // 2. Recupera i rating in batch
      const filmIds = postgresResponse.data.content.map(film => film.id);
      console.log('DAS - Richiesta rating per film IDs:', filmIds);

      const ratingsResponse = await axios.post(`${SERVICES.mongodb}/api/ratings/batch`, {
        filmIds
      }, { timeout: 5000 });

      // 3. Combina i risultati
      const ratingsMap = ratingsResponse.data.reduce((acc, item) => {
        acc[item.id] = item.rating;
        return acc;
      }, {});

      let enrichedFilms = postgresResponse.data.content.map(film => ({
        ...film,
        rating: ratingsMap[film.id] ?? null
      }));

      // 4. Filtra per rating minimo (escludi solo se rating è presente e < min)
      if (minRatingNum > 0) {
        enrichedFilms = enrichedFilms.filter(film =>
            film.rating === null || film.rating >= minRatingNum
        );
      }

      // 5. Ordina se specificato
      if (sortBy) {
        enrichedFilms = sortFilms(enrichedFilms, sortBy);
      }

      // 6. Gestione paginazione
      const pageable = postgresResponse.data.pageable;
      const totalElements = enrichedFilms.length;
      const totalPages = Math.ceil(totalElements / pageable.pageSize);

      const start = pageable.pageNumber * pageable.pageSize;
      const end = start + pageable.pageSize;
      const paginatedContent = enrichedFilms.slice(start, end);

      res.json({
        content: paginatedContent,
        pageable: {
          ...pageable,
          offset: start
        },
        totalElements,
        totalPages,
        last: end >= totalElements,
        first: pageable.pageNumber === 0,
        numberOfElements: paginatedContent.length,
        empty: paginatedContent.length === 0,
        sorted: !!sortBy
      });

    } else if (searchType === 'reviews') {
      res.json({
        status: 'debug',
        message: 'Ricerca recensioni ricevuta',
        params: req.query
      });
    } else {
      res.status(400).json({ error: 'Tipo di ricerca non valido' });
    }

  } catch (error) {
    console.error('DAS - Errore:', {
      message: error.message,
      url: error.config?.url,
      response: error.response?.data
    });

    res.status(500).json({
      error: 'Errore durante la ricerca',
      details: error.response?.data || error.message
    });
  }
});

function sortFilms(films, sortBy) {
  const [field, direction] = sortBy.split('_');
  const sortOrder = direction === 'asc' ? 1 : -1;

  return [...films].sort((a, b) => {
    // Gestione valori null (mantenimento in fondo)
    if (a[field] === null) return 1;
    if (b[field] === null) return -1;

    if (field === 'rating') {
      return (a.rating - b.rating) * sortOrder;
    } else if (field === 'date') {
      return (a.year - b.year) * sortOrder;
    }
    return 0;
  });
}


module.exports = router;