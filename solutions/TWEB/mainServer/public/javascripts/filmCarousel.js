// ==============================================
// CAROUSEL CLASS (FilmCarousel.js)
// ==============================================
class FilmCarousel {
    constructor() {
        // 1. Inizializza axios
        this.axios = window.axios;
        if (!this.axios) throw new Error('Axios non caricato');

        // 2. Recupera elementi DOM
        this.carousel = document.getElementById('staticCarousel');
        if (!this.carousel) throw new Error('Carosello non trovato');

        this.carouselInner = this.carousel.querySelector('.carousel-inner');
        if (!this.carouselInner) throw new Error('Elemento interno non trovato');

        // 3. Inizializza stato
        this.films = [];
        this.carouselInstance = null;
    }

    async init() {
        try {
            this.showLoader();

            // 4. Carica dati film
            const { data } = await this.axios.get('/films/carousel', {
                params: { t: Date.now() },
                headers: { 'Cache-Control': 'no-cache' }
            });

            this.films = data;

            // 5. Gestisci casi vuoti/errori
            if (!this.films.length) {
                this.showEmptyState();
                return;
            }

            // 6. Render e inizializzazione
            this.render();
            this.initCarousel();

        } catch (error) {
            console.error('Errore carosello:', error);
            this.showError(error);
            throw error;
        }
    }


    render() {
        // 7. Genera HTML per ogni film
        this.carouselInner.innerHTML = this.films.map((film, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${this.validatePosterUrl(film.poster)}" 
                     class="d-block w-100 h-100" 
                     style="object-fit: cover;"
                     alt="${film.title}"
                     onerror="this.src='/images/img.png'">
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
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div>
            </div>
        `;
    }

    showEmptyState() {
        this.carouselInner.innerHTML = `
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="alert alert-info">Nessun film disponibile</div>
            </div>
        `;
    }

    showError(error) {
        const errorMsg = error.response?.data?.message || error.message;
        this.carouselInner.innerHTML = `
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="alert alert-danger">
                    ${errorMsg}
                    <button class="btn btn-sm btn-outline-danger mt-2 retry-btn">Riprova</button>
                </div>
            </div>
        `;

        this.carouselInner.querySelector('.retry-btn')?.addEventListener('click', () => this.init());
    }

    validatePosterUrl(url) {
        if (!url) return '/images/placeholder-poster.jpg';
        return url.startsWith('http') ? url : `/images/${url}`;
    }

    addEventListeners() {
        this.carouselInner.querySelectorAll('.film-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filmId = e.target.dataset.filmId;
                window.location.href = `/film/${filmId}`;
            });
        });
    }

    destroy() {
        if (this.carouselInstance) {
            this.carouselInstance.dispose();
        }
    }
}