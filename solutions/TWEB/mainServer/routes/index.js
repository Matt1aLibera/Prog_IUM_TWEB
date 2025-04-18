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
            films: films,
            showCarousel: true,
            showSearchResults: false
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('pages/index', {
            title: 'Il mio Sito',
            user: req.session.user || null,
            films: [],
            showCarousel: true,
            showSearchResults: false
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

// Route per la ricerca completa (aggiornata per coerenza con autocomplete)
router.get('/films/search/full', async (req, res) => {
    try {
        const { q, page = 0, size = 15 } = req.query;
        const pageInt = Math.max(0, parseInt(page));
        const sizeInt = Math.min(Math.max(1, parseInt(size)), 100);

        if (!q || q.length < 2) {
            return res.render('pages/index', {
                showCarousel: false,
                showSearchResults: true,
                searchResults: '<div class="alert alert-info">Inserisci almeno 2 caratteri per la ricerca</div>'
            });
        }

        const response = await axios.get(
            `${DATA_AGGREGATION_SERVER}/api/films/search/full?q=${encodeURIComponent(q)}&page=${pageInt}&size=${sizeInt}`,
            { timeout: 20000 }
        );

        const totalElements = response.data.totalElements || 0;
        const totalPages = Math.ceil(totalElements / sizeInt);

        // Renderizza la pagina di risultati come stringa
        const searchResultsHtml = await new Promise((resolve, reject) => {
            res.app.render('pages/film-search-results', {
                content: response.data.content || [],
                query: q,
                currentPage: pageInt,
                totalPages: totalPages,
                totalElements: totalElements,
                layout: false // Importante: non usare il layout
            }, (err, html) => {
                if (err) reject(err);
                else resolve(html);
            });
        });

        // Invia i risultati come HTML o come JSON in base alla richiesta
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            res.send(searchResultsHtml);
        } else {
            res.render('pages/index', {
                showCarousel: false,
                showSearchResults: true,
                searchResults: searchResultsHtml
            });
        }

    } catch (error) {
        console.error('Full search error:', error.message);
        const errorHtml = `<div class="alert alert-danger">Errore durante la ricerca: ${error.message}</div>`;

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            res.status(500).send(errorHtml);
        } else {
            res.render('pages/index', {
                showCarousel: false,
                showSearchResults: true,
                searchResults: errorHtml
            });
        }
    }
});
// Route per la ricerca attori
router.get('/search/actors', (req, res) => {
    const query = req.query.q;
    // Qui implementerai la logica per cercare gli attori nel DB
    res.render('actor-search-results', {results: actorResults, query});
});

module.exports = router;
