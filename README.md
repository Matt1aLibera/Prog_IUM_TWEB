# Progetto Integrato: IUM + Tecnologie Web
![Linguaggio Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Linguaggio JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Linguaggio Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

### 🛠️ Frameworks & Libraries
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Handlebars](https://img.shields.io/badge/Handlebars.js-f0772b?style=for-the-badge&logo=handlebarsdotjs&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)

### 🗄️ Databases & Storage
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![JSON](https://img.shields.io/badge/Data-JSON-000000?style=for-the-badge&logo=json&logoColor=white)

### 🏗️ Architecture & Patterns
![Microservices](https://img.shields.io/badge/Architecture-Microservices-red?style=for-the-badge)
![MVC](https://img.shields.io/badge/Pattern-MVC-blue?style=for-the-badge)
![REST API](https://img.shields.io/badge/API-REST-green?style=for-the-badge)
![EDA](https://img.shields.io/badge/Analysis-Exploratory%20Data-purple?style=for-the-badge)

---

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

Nello sviluppo del progetto è stata utilizzata l'**Intelligenza Generativa** come supporto per la progettazione dell'architettura dei microservizi, l'implementazione del codice e il testing delle rotte.
