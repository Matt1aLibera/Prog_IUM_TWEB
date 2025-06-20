const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { connectUserDB } = require('./databases/user');
const initializeAdmin = require('./services/adminInit');
const authRoutes = require('./routes/index');
const chatRoutes = require('./routes/chatRoom')

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes); // Tutte le route inizieranno con /auth
app.use('/chat', chatRoutes); // Route delle chat

// Configurazione view engine (se necessario, altrimenti rimuovere)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Connessione DB e inizializzazione automatica
(async () => {
  try {
    await connectUserDB();
    await initializeAdmin(); // Usa il service dedicato
  } catch (error) {
    console.error('❌ Avvio fallito:', error);
    process.exit(1); // Termina l'applicazione in caso di errore critico
  }
})();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handlers
app.use((req, res, next) => next(createError(404)));

app.use((err, req, res, next) => {
  // Se stai usando API JSON-only:
  res.status(err.status || 500).json({
    error: err.message,
    ...(app.get('env') === 'development' && { stack: err.stack })
  });
});

module.exports = app;