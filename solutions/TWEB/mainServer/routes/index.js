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
          params: { limit: 15 }, // Aumentato a 15
          timeout: 5000
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
    const { data: film } = await axios.get(`${DATA_AGGREGATION_SERVER}/api/films/${req.params.id}`, {
      timeout: 5000 // Timeout di 5 secondi
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
      return res.status(404).json({ error: 'Film non trovato' });
    }
    console.error('Film details error:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
