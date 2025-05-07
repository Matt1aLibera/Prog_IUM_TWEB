var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
require('passport');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo');

var indexRouter = require('./routes/index');
var loginRouter = require('./routes/auth');
var adminRouter =require ('./routes/admin')
var chatRouter =require('./routes/chatRoom')

var app = express();
// Configurazione Handlebars
const { engine } = require('express-handlebars');
const hbs = engine({
  extname: '.hbs',
  defaultLayout: 'layout',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  },
  helpers: {
    // Helper esistente per la serializzazione JSON
    json: function(context) {
      return JSON.stringify(context).replace(/"/g, '&quot;');
    },

    // Helper per le icone delle stanze chat (NUOVO)
    roomIcon: function(type) {
      const icons = {
        film: 'film',
        actor: 'person',
        crew: 'people',
        character: 'mask',
        generale: 'chat' // Aggiunto come fallback generale
      };
      return icons[type] || 'chat-dots'; // Icona di fallback
    },

    // Helpers per la paginazione (esistenti)
    encodeURIComponent: function(str) {
      return encodeURIComponent(str);
    },
    gt: (a, b) => a > b,
    lt: (a, b) => a < b,
    eq: (a, b) => a === b,
    sub: (a, b) => a - b,
    add: (a, b) => a + b,
    div: (a, b) => a / b,
    ceil: (a) => Math.ceil(a),
    max: (a, b) => Math.max(a, b),
    min: (a, b) => Math.min(a, b),
    range: (start, end) => {
      const result = [];
      for (let i = start; i < end; i++) {
        result.push(i);
      }
      return result;
    }
  }
});

app.engine('hbs', hbs);
app.set('views', path.join(__dirname, 'views')); // Punta alla cartella padre
app.set('view engine', 'hbs');

// Aggiungi questo middleware prima delle route
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Middleware base
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'university-project-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 86400000, // 1 giorno in ms
    sameSite: 'strict'
  },
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/session_store',
    collectionName: 'multi_sessions',
    ttl: 86400, // 1 giorno in secondi
    autoRemove: 'interval',
    autoRemoveInterval: 60, // Minuti
    touchAfter: 3600 // 1 ora
  })
}));
app.use((req, res, next) => {
  // Middleware vuoto che bypassa Passport per le sessioni
  next();
});
// File statici
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

// Route
app.use('/admin', adminRouter);
app.use('/', indexRouter);
app.use('/auth', loginRouter);  // invece di '/login'
app.use('/sio', chatRouter)


// Gestione 404
app.use(function(req, res, next) {
  next(createError(404));
});

// Gestione errori
app.use(function(err, req, res) {
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