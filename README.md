# Progetto Integrato: IUM + Tecnologie Web

### 🎓 Percorso Accademico

**Studente:** Mattia Liberatore  
**Corso:** Interazione Uomo Macchina (IUM) + Tecnologie Web (TWEB)  
**Università:** Università degli Studi di Torino - Dipartimento di Informatica

-----

## 📝 Panoramica del Progetto

Il progetto si divide in due anime complementari:

1.  **TWEB**: Un'applicazione web basata su una **architettura a microservizi** che gestisce dataset cinematografici (IMDB, Rotten Tomatoes, Oscar) utilizzando database relazionali (PostgreSQL) e non relazionali (MongoDB).
2.  **IUM**: Un'analisi esplorativa dei dati (EDA) condotta su Jupyter Notebook, focalizzata sulla visualizzazione avanzata e la pulizia del dataset IMDB tramite Python.

-----

## 🌐 1. Tecnologie Web (TWEB)

### Architettura a Microservizi ("Costellazione")

[cite_start]Il sistema è composto da diversi server indipendenti coordinati tra loro[cite: 31]:

  * [cite_start]**Main Server (Express)**: Gestisce il routing principale e lo smistamento delle richieste[cite: 27, 36].
  * [cite_start]**Data Aggregation Server**: Aggrega i dati provenienti dai database eterogenei prima di restituirli al client[cite: 30, 33].
  * [cite_start]**Spring Boot Server**: Gestisce i dati statici su **PostgreSQL** tramite caricamento a batch scalabile[cite: 13, 20, 22].
  * [cite_start]**Film Mongo Server**: Gestisce le recensioni e i rating dinamici su **MongoDB**[cite: 15, 22].
  * [cite_start]**User Mongo Server**: Gestisce l'autenticazione, i profili utente e lo stato delle chat room[cite: 28, 45].

### Funzionalità Chiave

  * [cite_start]**Sistema di Chat**: Comunicazione real-time basata su **Socket.IO** con supporto a stanze tematiche[cite: 45, 46].
  * [cite_start]**Gestione Sessioni Multi-Tab**: Implementazione personalizzata basata su `tabId` per permettere l'utilizzo di più account o sessioni indipendenti nello stesso browser[cite: 47, 53].
  * [cite_start]**Dashboard Admin**: Accesso riservato per il caricamento e la normalizzazione automatica dei dataset tramite interfaccia web[cite: 29].

-----

## 📊 2. Analisi Dati (IUM)

[cite_start]L'analisi è stata condotta nel file `analisi_dati.ipynb` con un focus sulla pulizia profonda del dataset IMDB (periodo 1890-2023)[cite: 60, 65].

### Visualizzazioni Implementate

[cite_start]Sono state realizzate oltre 12 tipologie di grafici per interpretare i trend del settore cinematografico[cite: 5, 79]:

  * [cite_start]**Geografiche**: Mappe di distribuzione della produzione globale[cite: 70].
  * [cite_start]**Distribuzione**: Violin plot per i rating e Heat map multivariate[cite: 71, 72].
  * [cite_start]**Gerarchiche**: Treemap per analizzare la relazione tra generi e produzioni[cite: 73].
  * [cite_start]**Evolutive**: Scatter plot sulla variabilità qualitativa nel tempo[cite: 66].

-----

## 🛠️ Installazione e Configurazione

### Requisiti dei Dati

[cite_start]Per il funzionamento del sistema, è necessario inserire i file CSV nelle seguenti directory (da creare se mancanti)[cite: 84]:

**Per TWEB:**

  * [cite_start]`solutions/TWEB/springBootServer/src/main/resources/csv`: actor, movies, oscar Awards, ecc[cite: 85].
  * [cite_start]`solutions/TWEB/filmMongoServer/csv`: movies e rotten tomatoes reviews[cite: 86].

**Per IUM:**

  * [cite_start]`solutions/IUM/dataSets/mainDataSet`: dataset IMDB completo[cite: 87].

### Avvio

1.  Configurare le istanze di **PostgreSQL** e **MongoDB**.
2.  Avviare i server della costellazione partendo dai database server verso il MainServer.
3.  [cite_start]Accedere come `admin` per popolare i database tramite la navbar[cite: 29].

-----

## ⚠️ Limitazioni Note

  * [cite_start]**Performance**: La separazione dei rating (MongoDB) dai dati dei film (PostgreSQL) comporta un aumento della latenza nelle query aggregate[cite: 24, 33].
  * [cite_start]**SSR**: Il rendering lato server è implementato parzialmente, il che può causare discrepanze visive in alcuni caricamenti diretti di pagina[cite: 38].
  * [cite_start]**Sessioni**: Ogni nuova tab richiede un login separato per garantire la sicurezza del sistema di chat[cite: 57, 58].

-----

### 📚 Bibliografia e Strumenti

[cite_start]Nello sviluppo del progetto è stata utilizzata l'**Intelligenza Generativa** come supporto per la progettazione dell'architettura dei microservizi, l'implementazione del codice e il testing delle rotte[cite: 89, 90].
