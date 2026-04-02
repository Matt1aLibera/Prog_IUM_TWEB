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

Il sistema è composto da diversi server indipendenti coordinati tra loro[cite: 31]:

  * **Main Server (Express)**: Gestisce il routing principale e lo smistamento delle richieste.
  * **Data Aggregation Server**: Aggrega i dati provenienti dai database eterogenei prima di restituirli al client.
  * **Spring Boot Server**: Gestisce i dati statici su **PostgreSQL** tramite caricamento a batch scalabile.
  * **Film Mongo Server**: Gestisce le recensioni e i rating dinamici su **MongoDB**.
  * **User Mongo Server**: Gestisce l'autenticazione, i profili utente e lo stato delle chat room.

### Funzionalità Chiave

  * **Sistema di Chat**: Comunicazione real-time basata su **Socket.IO** con supporto a stanze tematiche.
  * **Gestione Sessioni Multi-Tab**: Implementazione personalizzata basata su `tabId` per permettere l'utilizzo di più account o sessioni indipendenti nello stesso browser[cite: 47, 53].
  * **Dashboard Admin**: Accesso riservato per il caricamento e la normalizzazione automatica dei dataset tramite interfaccia web.

-----

## 📊 2. Analisi Dati (IUM)

L'analisi è stata condotta nel file `analisi_dati.ipynb` con un focus sulla pulizia profonda del dataset IMDB (periodo 1890-2023).

### Visualizzazioni Implementate

Sono state realizzate oltre 12 tipologie di grafici per interpretare i trend del settore cinematografico:

  * **Geografiche**: Mappe di distribuzione della produzione globale.
  * **Distribuzione**: Violin plot per i rating e Heat map multivariate.
  * **Gerarchiche**: Treemap per analizzare la relazione tra generi e produzioni.
  * **Evolutive**: Scatter plot sulla variabilità qualitativa nel tempo.

-----

## 🛠️ Installazione e Configurazione

### Requisiti dei Dati

Per il funzionamento del sistema, è necessario inserire i file CSV nelle seguenti directory (da creare se mancanti):

**Per TWEB:**

  * `solutions/TWEB/springBootServer/src/main/resources/csv`: actor, movies, oscar Awards, ecc.
  * `solutions/TWEB/filmMongoServer/csv`: movies e rotten tomatoes reviews.

**Per IUM:**

  * `solutions/IUM/dataSets/mainDataSet`: dataset IMDB completo.

### Avvio

1.  Configurare le istanze di **PostgreSQL** e **MongoDB**.
2.  Avviare i server della costellazione partendo dai database server verso il MainServer.
3.  Accedere come `admin` per popolare i database tramite la navbar.

-----

## ⚠️ Limitazioni Note

  * **Performance**: La separazione dei rating (MongoDB) dai dati dei film (PostgreSQL) comporta un aumento della latenza nelle query aggregate.
  * **SSR**: Il rendering lato server è implementato parzialmente, il che può causare discrepanze visive in alcuni caricamenti diretti di pagina.
  * **Sessioni**: Ogni nuova tab richiede un login separato per garantire la sicurezza del sistema di chat.

-----

### 📚 Bibliografia e Strumenti

[cite_start]Nello sviluppo del progetto è stata utilizzata l'**Intelligenza Generativa** come supporto per la progettazione dell'architettura dei microservizi, l'implementazione del codice e il testing delle rotte[cite: 89, 90].
