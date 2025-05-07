var express = require('express');
var router = express.Router();
const DATA_AGGREGATION_SERVER = 'http://localhost:3003'; // URL auth-server
const axios = require('axios');

// Reindirizza /films/search?q=... a /films/search/full?q=...
router.get('/films/search', (req, res) => {
    if (req.query.q) {
        // Reindirizza mantenendo i parametri
        return res.redirect(308, `/films/search/full?q=${req.query.q}&page=${req.query.page || 0}`);
    }
    res.redirect('/'); // Fallback sicuro
});

/* GET home page. */
router.get('/', async (req, res) => {
    console.log('--- NUOVA RICHIESTA A / ---');

    const tabId = req.query.tabId; // Potrebbe essere undefined
    const user = tabId && req.session.tabSessions?.[tabId];

    console.log('TabId ricevuto:', tabId);
    console.log('Utente associato:', user);

    // Se c'è un utente ma non è autenticato, pulisci la sessione
    if (user && !user.isAuthenticated) {
        delete req.session.tabSessions[tabId];
        return res.redirect('/');
    }

    try {
        const showChat = req.query.view === 'chat';
        let films = [];

        // Chiama l'API del carosello SE:
        // 1. Non siamo in chat/non stiamo cercando, E
        // 2. L'utente è loggato OPPURE vogliamo precaricare i film per non loggati
        if (!showChat && !req.query.search) {
            try {
                console.log('Chiamando API carosello...');
                const response = await axios.get(`${DATA_AGGREGATION_SERVER}/api/carousel`, {
                    params: { limit: 15 },
                    timeout: 16000
                });
                films = response.data || [];
                console.log('Film ricevuti:', films.length);
            } catch (apiError) {
                console.error('Errore API carosello:', apiError.message);
                films = [];
            }
        }

        const baseData = {
            title: 'Il mio Sito',
            user: user,
            // Mostra il carosello SOLO se:
            // 1. Non siamo in chat/non stiamo cercando, E
            // 2. L'utente è loggato (se vuoi mostrarlo solo a utenti loggati)
            showCarousel: !showChat && !req.query.search && !!user,
            showSearchResults: !!req.query.search,
            showChat: showChat,
            films: films, // Film precaricati (sia per loggati che non loggati)
            chatContent: showChat && user ? '<div class="loading-spinner"></div>' : null
        };

        console.log('Dati inviati al template:', {
            showCarousel: baseData.showCarousel,
            filmsCount: baseData.films.length,
            userPresent: !!user
        });

        res.render('pages/index', baseData);
    } catch (error) {
        console.error('Errore generale in /:', error);
        res.render('pages/index', {
            title: 'Il mio Sito',
            user: null,
            films: [],
            showCarousel: false, // Disabilita per evitare loop
            showSearchResults: false,
            showChat: false,
            error: 'Errore temporaneo'
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
    res.setHeader('Cache-Control', 'no-store, max-age=0');
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


router.get('/film/:id', async (req, res) => {
    try {
        const {data: film} = await axios.get(`${DATA_AGGREGATION_SERVER}/api/films/${req.params.id}`, {
            timeout: 11000
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
        // Differenziazione tra API e browser
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json(formattedFilm);
        } else {
            // Renderizza la pagina completa con i dati del film
            return res.render('pages/index', {
                showCarousel: false,
                showSearchResults: false,
                filmDetails: formattedFilm // Passa i dati al template
            });
        }

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


module.exports = router;
