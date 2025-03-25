const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connessione a MongoDB
mongoose.connect('mongodb://localhost:27017/filmsDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Definizione Schema MongoDB
const filmSchema = new mongoose.Schema({
  id: String,
  rating: Number,
  visualizzazioni: Number
});

const Film = mongoose.model('Film', filmSchema);

// Route per ricevere dati
app.post('/api/films', async (req, res) => {
  try {
    await Film.insertMany(req.body);
    res.send("Dati caricati in MongoDB!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Errore");
  }
});

app.listen(4000, () => console.log("📊 Server MongoDB su http://localhost:4000"));
