var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/auth');

var app = express();

// Configurazione Handlebars
const { engine } = require('express-handlebars');
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'layout',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  }
}));
app.set('views', path.join(__dirname, 'views')); // Punta alla cartella padre
app.set('view engine', 'hbs');

// Middleware base
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Configurazione sessione
app.use(session({
  secret: process.env.SESSION_SECRET || 'university-project-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 86400000
  },
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/session_store',
    ttl: 86400
  }),
  genid: (req) => {
    return require('crypto').randomUUID(); // Debug
  }
}));
app.use(passport.initialize());
app.use(passport.authenticate('session'));

// File statici
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());

// Route
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', loginRouter);  // invece di '/login'

// Gestione 404
app.use(function(req, res, next) {
  next(createError(404));
});

// Gestione errori
app.use(function(err, req, res, next) {
  // Imposta le variabili locali
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Renderizza la pagina di errore
  res.status(err.status || 500);

  // Scegli UNA delle seguenti opzioni:

  // OPZIONE 1: Con layout specifico (assicurati che esista views/layouts/error-layout.hbs)
  // res.render('pages/error', { layout: 'error-layout' });

  // OPZIONE 2: Con layout principale (default)
  res.render('pages/error', { layout: 'layout' });

  // OPZIONE 3: Senza layout
  // res.render('pages/error');
});

module.exports = app;