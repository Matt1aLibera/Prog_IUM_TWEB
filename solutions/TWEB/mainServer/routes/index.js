var express = require('express');
var router = express.Router();
//const DATA_AGGREGATION_SERVER = 'http://localhost:3003'; // URL auth-server

/* GET home page. */
router.get('/', (req, res) => {
  // Se l'utente è loggato ma non dovrebbe esserlo (cookie residuo)
  if (req.session.user && !req.session.user.isAuthenticated) {
    req.session.destroy();
    return res.redirect('/');
  }

  res.render('pages/index', {
    title: 'Il mio Sito',
    user: req.session.user || null
  });
});

router.get('/films/carousel', async (req, res) => {
  try {
    const { data } = await axios.get(`${DATA_AGGREGATION_SERVER}/carousel`, {
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
