var express = require('express');
var router = express.Router();

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


module.exports = router;
