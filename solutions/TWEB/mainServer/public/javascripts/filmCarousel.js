// ==============================================
// CAROUSEL CLASS
// ==============================================
class FilmCarousel {
    constructor() {
        console.log('Costruttore FilmCarousel chiamato');
        console.log('Ricerca elemento #filmsCarousel...');
        this.carousel = document.getElementById('filmsCarousel');
        if (!this.carousel) {
            console.warn('Elemento carosello non trovato nel DOM');
            return;
        }

        console.log('Elemento carosello trovato:', this.carousel);
        this.carouselInner = this.carousel.querySelector('.carousel-inner');
        if (!this.carouselInner) {
            console.error('Elemento carousel-inner non trovato');
            return;
        }

        this.films = [];
        this.carouselInstance = null;
        this.initialized = false;
    }

    async init() {
        if (!this.carousel || !this.carouselInner) return;

        try {
            this.showLoader();
            console.log('Inizio caricamento dati carosello...');

            const response = await axios.get('/api/films/carousel', {
                headers: {
                    'Cache-Control': 'no-cache',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            this.films = response.data;
            console.log(`Ricevuti ${this.films.length} film`);

            if (this.films.length) {
                this.render();
                this.initCarousel();
                this.initialized = true;
                console.log('Carosello inizializzato con successo');
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Errore nel caricamento del carosello:', error);
            this.showError(error);
        }
    }

    render() {
        this.carouselInner.innerHTML = this.films.map((film, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <div class="carousel-poster-container">
                    <img src="${this.validatePosterUrl(film.poster)}" 
                         class="d-block w-100 carousel-poster" 
                         alt="${film.title}"
                         loading="lazy"
                         onerror="this.onerror=null;this.src='/images/placeholder-poster.jpg'">
                </div>
                <div class="carousel-caption d-none d-md-block">
                    <div class="caption-content bg-dark bg-opacity-75 p-3 rounded">
                        <h5>${film.title} (${film.year})</h5>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-warning text-dark">
                                ⭐ ${film.rating?.toFixed(1) || 'N/A'}
                            </span>
                            <button class="btn btn-sm btn-outline-light film-detail-btn" 
                                    data-film-id="${film.id}">
                                Dettagli
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Aggiungi event listener ai pulsanti
        this.addEventListeners();
    }

    initCarousel() {
        if (this.carouselInstance) {
            this.carouselInstance.dispose();
        }

        this.carouselInstance = new bootstrap.Carousel(this.carousel, {
            interval: 8000,
            touch: true,
            wrap: true,
            pause: 'hover'
        });
    }

    showLoader() {
        this.carouselInner.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 400px;">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    showEmptyState() {
        this.carouselInner.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 400px;">
                <div class="alert alert-info">
                    Nessun film disponibile al momento.
                </div>
            </div>
        `;
    }

    showError(error) {
        const errorMessage = error.response?.data?.message || error.message;
        this.carouselInner.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 400px;">
                <div class="alert alert-danger">
                    Errore nel caricamento: ${errorMessage}
                    <button class="btn btn-sm btn-outline-danger ms-2 retry-btn">
                        Riprova
                    </button>
                </div>
            </div>
        `;

        // Aggiungi event listener al pulsante riprova
        const retryBtn = this.carouselInner.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.init());
        }
    }

    validatePosterUrl(url) {
        if (!url) return '/images/placeholder-poster.jpg';
        return url.startsWith('http') ? url : `/images/${url}`;
    }

    addEventListeners() {
        // Gestione click sui pulsanti dettagli
        const detailBtns = this.carouselInner.querySelectorAll('.film-detail-btn');
        detailBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filmId = e.currentTarget.getAttribute('data-film-id');
                window.location.href = `/film/${filmId}`;
            });
        });
    }

    destroy() {
        if (this.carouselInstance) {
            this.carouselInstance.dispose();
            this.carouselInstance = null;
        }
        this.initialized = false;
    }
}

// Esposizione globale con controllo
if (typeof window !== 'undefined') {
    window.FilmCarousel = FilmCarousel;
}