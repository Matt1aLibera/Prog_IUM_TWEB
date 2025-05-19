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
      // 1. Prepara i parametri per Postgres includendo l'ordinamento
      const postgresParams = {
        title: params.filmQuery || null,
        yearFrom: params.yearFrom || null,
        yearTo: params.yearTo || null,
        oscarStatus: params.oscarStatus || null,
        genres: params.genres || null, // Non trasformare in array qui
        page: req.query.page || 0,
        size: req.query.size || 15,
        sort: translateSortParam(sortBy)
      };

      // Aggiungi il filtro relazionale corretto
      if (params.filmSearchType && params.searchQuery) {
        postgresParams[params.filmSearchType] = params.searchQuery;
        console.log(`Applying ${params.filmSearchType} filter: ${params.searchQuery}`);
      }

      console.log('DAS - Invio a Postgres:', postgresParams);
      // Chiamata axios con paramsSerializer
      const postgresResponse = await axios.get(`${SERVICES.postgres}/api/films/advanced-search`, {
        params: postgresParams,
        paramsSerializer: (params) => {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== null) {
              if (Array.isArray(value)) {
                value.forEach(v => query.append(key, v)); // Genera genre=Horror&genre=Comedy
              } else {
                query.append(key, value);
              }
            }
          });
          return query.toString();
        },
        timeout: 20000
      });

      // 2. Mantieni la struttura originale di paginazione
      const originalPagination = {
        ...postgresResponse.data.pageable,
        totalElements: postgresResponse.data.totalElements,
        totalPages: postgresResponse.data.totalPages
      };

      let enrichedFilms = postgresResponse.data.content;
      const filmIds = postgresResponse.data.content.map(film => film.id);
      console.log('DAS - Richiesta rating per film IDs:', filmIds);

      const ratingsResponse = await axios.post(`${SERVICES.mongo}/api/ratings/batch`, {
        filmIds
      }, { timeout: 5000 });

      const ratingsMap = ratingsResponse.data.reduce((acc, item) => {
        acc[item.id] = item.rating;
        return acc;
      }, {});

      enrichedFilms = enrichedFilms.map(film => ({
        ...film,
        rating: ratingsMap[film.id] ?? null
      }));

      // 3. Filtra per rating minimo se specificato
      if (minRatingNum > 0) {
        const filteredFilms = enrichedFilms.filter(film => {
          return film.rating !== null && film.rating >= minRatingNum;
        });

        // Se dopo il filtro abbiamo ancora risultati, usiamoli
        // Altrimenti mostriamo i film senza rating (con avviso)
        if (filteredFilms.length > 0) {
          enrichedFilms = filteredFilms;
        } else {
          // Mostriamo i film senza rating ma aggiungiamo un flag
          enrichedFilms = enrichedFilms.filter(film => film.rating === null);
          enrichedFilms.metadata = {
            warning: "Nessun film soddisfa il rating minimo. Mostrati film senza rating disponibile"
          };
        }
      }

      // 5. Restituisci con la paginazione originale del Postgres
      res.json({
        content: enrichedFilms,
        pageable: originalPagination,
        totalElements: originalPagination.totalElements,
        totalPages: originalPagination.totalPages,
        last: postgresResponse.data.last,
        first: postgresResponse.data.first,
        numberOfElements: enrichedFilms.length,
        empty: enrichedFilms.length === 0,
        sorted: !!sortBy
      });

    } else if (searchType === 'reviews') {
      const { filmQuery, criticQuery, minRating, topCriticsOnly, page = 0, size = 15 } = req.query;

      // Validazione
      if (!filmQuery && !criticQuery) {
        return res.status(400).json({
          error: 'Specificare almeno il titolo del film o il nome del critico'
        });
      }

      // Costruzione query per MongoDB
      const query = {};
      if (filmQuery) query.movie_title = filmQuery;
      if (criticQuery) query.critic_name = criticQuery;
      if (minRating) query.normalized_score = { $gte: parseFloat(minRating) };

      const mongoParams = {
        query,
        sort: buildReviewSortObject(sortBy),
        page: Math.max(0, parseInt(page)),
        size: Math.min(Math.max(1, parseInt(size)), 100),
        topCriticsOnly: topCriticsOnly === 'true'
      };

      console.log('DAS - Invio a MongoDB:', mongoParams);

      // Chiamata al MongoDB service
      const response = await axios.post(`${SERVICES.mongo}/api/advanced-search/reviews`, mongoParams, {
        timeout: 20000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('DAS - Risposta MongoDB:', {
        dataLength: response.data.data?.length,
        pagination: response.data.pagination,
        stats: response.data.stats
      });
      return res.json({
        content: response.data.data || [],
        totalElements: response.data.pagination?.totalItems || 0,
        totalPages: response.data.pagination?.totalPages || 1,
        // Aggiungi stats se servono
        stats: response.data.stats,
        // Mantieni compatibilità con l'esistente
        pageable: {
          pageNumber: mongoParams.page,
          pageSize: mongoParams.size
        }
      });
    } else {
      res.status(400).json({ error: 'Tipo di ricerca non valido' });
    }

  } catch (error) {
    console.error('DAS - Errore:', error.message);
    res.status(500).json({
      error: 'Errore durante la ricerca',
      details: error.response?.data || error.message
    });
  }
})

// Aggiungi questa funzione helper per tradurre il parametro sortBy
function translateSortParam(sortBy) {
  if (!sortBy) return 'date_desc'; // Default: più recenti prima

  const [field, direction] = sortBy.split('_');

  // Per i film accettiamo solo ordinamento per data
  if (field !== 'date') return 'date_desc';

  return `${field}_${direction}`; // Es: date_desc o date_asc
}
// helpers/reviewSortHelper.js
function buildReviewSortObject(sortBy) {
  if (!sortBy) return { review_date: -1 }; // Default: più recenti prima

  const [field, direction] = sortBy.split('_');
  const sortDirection = direction === 'asc' ? 1 : -1;

  switch (field) {
    case 'date':
      return { review_date: sortDirection };
    case 'rating':
      return { normalized_score: sortDirection, review_date: -1 };
    default:
      return { review_date: -1 }; // Default per valori non riconosciuti
  }
}
module.exports = router;