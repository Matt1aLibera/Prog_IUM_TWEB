var express = require('express');
var router = express.Router();
const DATA_AGGREGATION_SERVER = 'http://localhost:3003'; // URL auth-server
const axios = require('axios');
/* GET home page. */
router.get('/', async (req, res) => {
    if (req.session.user && !req.session.user.isAuthenticated) {
        req.session.destroy();
        return res.redirect('/');
    }

    try {
        const films = req.session.user
            ? (await axios.get(`${DATA_AGGREGATION_SERVER}/api/carousel`, {
                params: {limit: 15}, // Aumentato a 15
                timeout: 16000
            })).data
            : [];

        res.render('pages/index', {
            title: 'Il mio Sito',
            user: req.session.user || null,
            films: films // Ora contiene solo id, title, posterUrl e rating
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('pages/index', {
            title: 'Il mio Sito',
            user: req.session.user || null,
            films: []
        });
    }
});

router.get('/films/:id', async (req, res) => {
    try {
        const {data: film} = await axios.get(`${DATA_AGGREGATION_SERVER}/api/films/${req.params.id}`, {
            timeout: 11000 // Timeout di 5 secondi
        });

        // Formatta la durata e aggiungi campo year se non presente
        const formattedFilm = {
            ...film,
            duration: film.movie?.minute ?
                `${Math.floor(film.movie.minute / 60)}h ${film.movie.minute % 60}m` :
                null,
            year: film.movie?.date || film.movie?.year // Gestisce entrambi i casi
        };

        // Cache controllata per 1 ora
        res.set('Cache-Control', 'public, max-age=3600');
        res.json(formattedFilm);

    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({error: 'Film non trovato'});
        }
        console.error('Film details error:', error);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || 'Errore interno del server',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Route per l'autocomplete
router.get('/films/search/autocomplete', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        // MODIFICA CHIAVE: usa l'endpoint corretto del DAS
        const response = await axios.get('http://localhost:3003/api/films/search/autocomplete', {
            params: { q },
            timeout: 16000
        });

        res.json(response.data || []);

    } catch (error) {
        console.error('Autocomplete error:', error.message);
        res.json([]);
    }
});

// Route per la ricerca completa
router.get('/films/search/full', async (req, res) => {
    try {
        const {q, page = 0, size = 15} = req.query;

        if (!q || q.length < 2) {
            return res.render('film-search-results', {
                content: [],
                pageable: {pageNumber: parseInt(page), pageSize: parseInt(size)},
                totalElements: 0,
                query: q
            });
        }

        const response = await axios.get(
            `${DATA_AGGREGATION_SERVER}/api/films/search/full?q=${encodeURIComponent(q)}&page=${page}&size=${size}`
        );

        res.render('film-search-results', {
            content: response.data.content,
            pageable: response.data.pageable,
            totalElements: response.data.totalElements,
            query: q
        });
    } catch (error) {
        console.error('Full search error:', error.message);
        res.status(500).render('error', {message: 'Errore durante la ricerca'});
    }
});

// Route per la ricerca attori
router.get('/search/actors', (req, res) => {
    const query = req.query.q;
    // Qui implementerai la logica per cercare gli attori nel DB
    res.render('actor-search-results', {results: actorResults, query});
});

module.exports = router;
