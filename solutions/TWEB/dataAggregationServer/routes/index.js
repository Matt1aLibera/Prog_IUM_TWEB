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

/**
 * GET /carousel - Retrieves highly rated films for homepage carousel
 * @param {number} [limit=15] - Max results to return (max 20)
 * @returns {Object[]} 200 - Array of carousel items with poster and rating
 * @throws {502} If dependent services are unavailable
 */
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

/**
 * GET /films/:id - Aggregates complete film details from multiple services
 * @param {number} id - Numeric film identifier
 * @returns {Object} 200 - Combined film data with PostgreSQL details and MongoDB rating
 * @throws {400} Invalid film ID format
 * @throws {502} If PostgreSQL service is unavailable
 */
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

/**
 * GET /films/search/full - Full-text film search with pagination
 * @param {string} q - Search query (URL encoded)
 * @param {number} [page=0] - Pagination offset (0-based)
 * @param {number} [size=15] - Items per page
 * @returns {Object} 200 - Paginated search results with Spring Data format
 * @throws {500} If search service fails
 */
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
/**
 * GET /films/search/autocomplete - Fast autocomplete suggestions
 * @param {string} q - Partial search query
 * @returns {Object[]} 200 - Array of autocomplete suggestions
 * @throws {500} If autocomplete service fails
 */
router.get('/films/search/autocomplete', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const { data } = await axios.get(
        `${SERVICES.postgres}/api/films/search/autocomplete?q=${encodeURIComponent(q)}`,
        { timeout: 17000 }
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
/**
 * POST /oscars/search - Searches for Oscar nominations
 * @param {string} filmName - Film name to search
 * @param {number} [year] - Optional ceremony year filter
 * @returns {Object[]} 200 - Array of Oscar nominations
 * @throws {500} If Oscar data service fails
 */
router.post('/oscars/search', async (req, res) => {
  try {
    const { filmName, year } = req.body;

    // 1. Chiamata al Postgres Server
    const response = await axios.get(`${SERVICES.postgres}/api/oscars/search`, {
      params: { filmName, year }
    });

    // 2. Formatta la risposta
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
 * GET /films/:title/reviews - Aggregates and filters film reviews
 * @param {string} title - URL encoded film title
 * @param {number} [limit=10] - Max results per page (max 50)
 * @param {number} [offset=0] - Pagination offset
 * @param {number} [minRating] - Minimum review rating (0-5)
 * @param {number} [maxRating] - Maximum review rating (0-5)
 * @returns {Object} 200 - Reviews with pagination and stats
 * @throws {502} If MongoDB service is unavailable
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
/**
 * GET /advanced-search - Unified advanced search across multiple services
 * @param {string} searchType - 'films' or 'reviews'
 * @param {number} [minRating=0] - Minimum rating filter
 * @param {string} [sortBy] - Sorting criteria (field_direction)
 * @param {number} [page=0] - Pagination offset
 * @param {number} [size=15] - Items per page
 * @returns {Object} 200 - Paginated results with original service structure
 * @throws {400} Invalid search parameters
 * @throws {500} Search execution error
 */
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
      if (minRating) query.normalized_score = query.normalized_score = parseFloat(minRating);

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

/**
 * Translates sort parameter for PostgreSQL compatibility
 * @private
 * @param {string} sortBy - Original sort parameter
 * @returns {string} Translated sort parameter
 */
function translateSortParam(sortBy) {
  if (!sortBy) return 'date_desc'; // Default: più recenti prima

  const [field, direction] = sortBy.split('_');

  // Per i film accettiamo solo ordinamento per data
  if (field !== 'date') return 'date_desc';

  return `${field}_${direction}`; // Es: date_desc o date_asc
}
/**
 * Builds MongoDB sort object from query parameter
 * @private
 * @param {string} sortBy - Sort parameter (field_direction)
 * @returns {Object} MongoDB sort object
 */
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

/**
 * GET /by-genre - Gets films by genre with rating enrichment
 * @param {string} genre - Genre to filter by
 * @param {number} [limit=15] - Max results to return
 * @returns {Object[]} 200 - Films sorted by rating
 * @throws {500} If genre search fails
 */
router.get('/by-genre', async (req, res) => {
  const { genre, limit = 15 } = req.query;
  console.log(`DAS - Ricerca film per genere: ${genre}, limit: ${limit}`);

  try {
    // 1. Log dei parametri inviati a Postgres
    console.log('DAS - Invio richiesta a Postgres con parametri:', { genre, limit });

    // 2. Chiamata al Postgres Server con logging completo
    const postgresResponse = await axios.get(`${SERVICES.postgres}/api/films/by-genre`, {
      params: { genre, limit },
      timeout: 20000,
      validateStatus: (status) => status < 500 // Accetta anche 400 per debug
    }).catch(error => {
      console.error('DAS - Errore nella chiamata a Postgres:', {
        url: error.config?.url,
        params: error.config?.params,
        response: error.response?.data
      });
      throw error;
    });

    console.log('DAS - Risposta da Postgres:', {
      status: postgresResponse.status,
      data: postgresResponse.data
    });

    const filmsWithOscars = postgresResponse.data;
    if (!filmsWithOscars?.length) {
      console.log('DAS - Nessun film trovato per il genere:', genre);
      return res.json([]);
    }

    // 3. Estrai ID con validazione rigorosa
    const filmIds = filmsWithOscars
        .map(film => {
          const id = parseInt(film.id);
          if (isNaN(id)) {
            console.error('DAS - ID film non numerico:', film.id);
            return null;
          }
          return id;
        })
        .filter(id => id !== null);

    if (filmIds.length === 0) {
      console.error('DAS - Nessun ID valido dopo il filtraggio');
      return res.status(400).json({ error: "ID film non valido" });
    }

    console.log('DAS - ID validi per MongoDB:', filmIds);

    // 4. Chiamata a MongoDB con logging
    const ratingsResponse = await axios.post(`${SERVICES.mongo}/api/ratings/batch`, {
      filmIds
    }, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    }).catch(error => {
      console.error('DAS - Errore nella chiamata a MongoDB:', {
        url: error.config?.url,
        data: error.config?.data,
        response: error.response?.data
      });
      throw error;
    });

    console.log('DAS - Risposta da MongoDB:', ratingsResponse.data);

    // 5. Arricchisci i film
    const enrichedFilms = filmsWithOscars.map(film => {
      const rating = ratingsResponse.data.find(item => item.id === parseInt(film.id))?.rating || null;
      return { ...film, rating };
    });

    // 6. Ordina e restituisci
    const sortedFilms = enrichedFilms.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    res.json(sortedFilms);

  } catch (error) {
    console.error('DAS - Errore completo:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({
      error: "Errore interno del server",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
module.exports = router;