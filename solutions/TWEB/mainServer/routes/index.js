var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.render('pages/index', {
    error: req.query.login_failed ? req.flash('error') : null,
    formData: req.body // Mantiene i valori inseriti
  });
});

module.exports = router;
