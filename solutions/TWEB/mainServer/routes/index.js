var express = require('express');
var router = express.Router();
const DATA_AGGREGATION_SERVER = 'http://localhost:3003'; // URL auth-server
const axios = require('axios');
/* GET home page. */
router.get('/', async (req, res) => {
  // Gestione sessione invalida
  if (req.session.user && !req.session.user.isAuthenticated) {
    req.session.destroy();
    return res.redirect('/');
  }

  try {
    // Carica i film SOLO se l'utente è autenticato
    const films = req.session.user
        ? (await axios.get(`${DATA_AGGREGATION_SERVER}/api/carousel?limit=5`)).data
        : [];

    res.render('pages/index', {
      title: 'Il mio Sito',
      user: req.session.user || null,
      films: films.map(f => ({
        posterUrl: f.poster, // <-- Qui rinominiamo il campo
        title: f.title,
        description: f.tagline || f.description
      }))
    });

  } catch (error) {
    console.error('Error loading films:', error);
    // Fallback senza film
    res.render('pages/index', {
      title: 'Il mio Sito',
      user: req.session.user || null,
      films: []
    });
  }
});
//usare curl -X GET "http://localhost:3000/films/carousel?limit=5"
router.get('/films/carousel', async (req, res) => {
  try {
    const { data } = await axios.get(`${DATA_AGGREGATION_SERVER}/api/carousel`, {
      params: {
        limit: 10, // Limite predefinito
        ...req.query // Permette override da frontend
      },
      timeout: 5000
    });

    // Cache per 1 ora
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(data);

  } catch (error) {
    console.error('Carousel error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to load carousel data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
