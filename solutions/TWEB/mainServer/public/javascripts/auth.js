// =============================================
// CONFIGURAZIONE INIZIALE E VARIABILI GLOBALI
// =============================================
const API_BASE_URL = window.location.origin;
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Variabili globali per la ricerca
let currentSearchType = 'film';
let autocompleteTimeout;

// Corregge la history del browser
if (window.location.pathname === '/films/search' && window.location.search) {
    const newUrl = `/films/search/full${window.location.search}`;
    window.history.replaceState(null, '', newUrl);
}
// Patch critica per il bug del browser
window.addEventListener('popstate', function(event) {
    // Ignora il popstate iniziale su alcuni browser
    if (event.state === null && window.location.pathname === '/') return;

    AppState.handlePopState(event);
});
// =============================================
// FUNZIONI DI UTILITÀ GENERALI
// =============================================

// Funzione per tornare alla vista precedente
function backToPreviousView() {
    // Usa direttamente l'API del browser
    window.history.go(-1);
}

function hideAllSections() {
    document.getElementById('authFormsSection')?.classList.add('hidden-section');
    document.getElementById('dashboardSection')?.classList.add('hidden-section');
    document.getElementById('loaderSection')?.classList.add('hidden-section');
}

function showDashboard() {
    hideAllSections();
    document.getElementById('dashboardSection').classList.remove('hidden-section');
    updateWelcomeMessage();
}

function updateWelcomeMessage(username) {
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg) {
        welcomeMsg.textContent = username
            ? `Benvenuto, ${username}!`
            : 'Benvenuto nella tua Dashboard';
    }
}

function showAlert(message, type = 'info', duration = 5000) {
    document.querySelectorAll('.global-alert, .alert').forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show ${type === 'info' || duration > 7000 ? 'global-alert' : 'local-alert'}`;

    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;

    const cardBody = document.querySelector('.card-body');
    if (cardBody && !alertDiv.classList.contains('global-alert')) {
        cardBody.prepend(alertDiv);
    } else {
        document.body.appendChild(alertDiv);
    }

    if (duration) {
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }, duration);
    }
}

function closeMobileMenu() {
    const navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse?.classList.contains('show')) {
        navbarCollapse.classList.remove('show');
    }
}

// =============================================
// GESTIONE AUTENTICAZIONE E UTENTE
// =============================================
async function checkAuthState() {
    try {
        const {data} = await axios.get('/auth/check', {
            params: {t: Date.now()},
            headers: {'Cache-Control': 'no-cache'}
        });

        if (data.authenticated) {
            updateUIForAuthenticatedUser(data.user);
            return true;
        } else {
            await updateUIForUnauthenticated();
            return false;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        await updateUIForUnauthenticated();
        return false;
    }
}

function updateUIForAuthenticatedUser(user) {
    // Update navbar
    const greeting = document.querySelector('#userGreeting');
    if (greeting) {
        greeting.textContent = `Ciao, ${user.username}`;
        greeting.classList.remove('d-none');
    }

    document.querySelector('#logoutBtn').classList.remove('d-none');
    document.querySelector('#loginBtn').classList.add('d-none');
    document.querySelector('#registerBtn').classList.add('d-none');
    document.querySelector('#chatBtn').classList.remove('d-none');

    // Update admin button
    updateAdminButton(user.role === 'admin');

    // Update welcome message and show dashboard
    updateWelcomeMessage(user.username);
    showDashboard();
}

function updateUIForUnauthenticated() {
    document.querySelector('#userGreeting').classList.add('d-none');
    document.querySelector('#logoutBtn').classList.add('d-none');
    document.querySelector('#loginBtn').classList.remove('d-none');
    document.querySelector('#registerBtn').classList.remove('d-none');
    document.querySelector('#chatBtn').classList.add('d-none');
    updateAdminButton(false);
    return showAuthForms();
}

function updateAdminButton(isAdmin) {
    const adminBtn = document.getElementById('loadDbBtn');
    if (!adminBtn) return;

    if (isAdmin) {
        adminBtn.classList.remove('d-none');
        adminBtn.disabled = false;
    } else {
        adminBtn.classList.add('d-none');
        adminBtn.disabled = true;
    }
}

// =============================================
// GESTIONE FORM DI AUTENTICAZIONE
// =============================================
async function showAuthForms() {
    hideAllSections();
    document.getElementById('authFormsSection').classList.remove('hidden-section');
    toggleForms(true);
    await setupAuthForms();
}

async function setupAuthForms() {
    toggleForms(true);

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    if (switchToRegister && switchToLogin) {
        switchToRegister.addEventListener('click', () => toggleForms(false));
        switchToLogin.addEventListener('click', () => toggleForms(true));
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.username.value.trim();
            const password = loginForm.password.value.trim();

            if (!username || !password) {
                showAlert('Compila tutti i campi', 'warning');
                return;
            }

            await handleAuthRequest(
                loginForm,
                '/auth/login',
                {username, password},
                'Accedi',
                (userData) => updateUIForAuthenticatedUser(userData)
            );
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.username.value.trim();
            const password = registerForm.password.value.trim();
            const confirmPassword = registerForm.confirmPassword.value.trim();

            if (!username || !password || !confirmPassword) {
                showAlert('Compila tutti i campi', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                showAlert('Le password non coincidono', 'danger');
                return;
            }

            if (password.length < 6) {
                showAlert('La password deve avere almeno 6 caratteri', 'danger');
                return;
            }

            await handleAuthRequest(
                registerForm,
                '/auth/register',
                {username, password, confirmPassword},
                'Registrati',
                () => {
                    showAlert('Registrazione completata! Ora puoi accedere', 'success');
                    registerForm.reset();
                    toggleForms(true);
                }
            );
        });
    }
}

async function handleAuthRequest(form, endpoint, data, buttonText, onSuccess) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${buttonText} in corso...`;
    submitBtn.disabled = true;

    try {
        const {data: result} = await axios.post(endpoint, data);
        if (result.success) {
            if (endpoint === '/auth/login') {
                // Salva SOLO i dati necessari in sessionStorage
                sessionStorage.setItem('chatUser', JSON.stringify({
                    id: result.user.id,
                    username: result.user.username
                }));
                window.location.reload();
            }
            if (typeof onSuccess === 'function') onSuccess(result.user || result);
        } else {
            showAlert(result.error || `${buttonText} fallito`, 'danger');
        }
    } catch (error) {
        console.error(`${buttonText} error:`, error);
        showAlert(error.response?.data?.error || `${buttonText} fallito`, 'danger');
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

function toggleForms(showLogin) {
    const loginFormContainer = document.getElementById('loginFormContainer');
    const registerFormContainer = document.getElementById('registerFormContainer');

    if (loginFormContainer && registerFormContainer) {
        if (showLogin) {
            loginFormContainer.classList.remove('d-none');
            registerFormContainer.classList.add('d-none');
        } else {
            loginFormContainer.classList.add('d-none');
            registerFormContainer.classList.remove('d-none');
        }

        const existingAlert = document.querySelector('.alert');
        if (existingAlert) existingAlert.remove();
    }
}

async function logout() {
    const logoutBtn = document.querySelector('#logoutBtn');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logout...';
        logoutBtn.disabled = true;
    }

    try {
        await axios.post('/auth/logout');
        await updateUIForUnauthenticated();
    } catch (error) {
        console.error('Errore durante il logout:', error);
        showAlert('Errore di connessione durante il logout', 'danger');
    } finally {
        if (logoutBtn) {
            logoutBtn.innerHTML = 'Logout';
            logoutBtn.disabled = false;
        }
    }
}

// =============================================
// GESTIONE NAVBAR E PULSANTI
// =============================================
function setupNavbarEvents() {
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('#loginBtn, #registerBtn, #logoutBtn, #loadDbBtn, #chatBtn');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        try {
            switch (target.id) {
                case 'loginBtn':
                    await handleLoginClick();
                    break;
                case 'registerBtn':
                    await handleRegisterClick();
                    break;
                case 'logoutBtn':
                    await handleLogoutClick(target);
                    break;
                case 'loadDbBtn':
                    await handleDbLoad(target);
                    break;
                case 'chatBtn':
                    await handleChatClick(target);
                    break;
            }
        } catch (error) {
            console.error(`${target.id} error:`, error);
            showAlert(`Errore in ${target.id}`, 'danger');
            await checkAuthState();
        }
    });
}

async function handleChatClick(button) {
    const originalHtml = button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Caricamento...';
    button.disabled = true;

    try {
        // 1. Mostra la sezione chat
        const chatSection = document.getElementById('chatSection');
        chatSection.classList.remove('d-none');

        // 2. Carica il contenuto solo se vuoto
        if (chatSection.children.length === 0) {
            const response = await axios.get('/sio/chat');
            chatSection.innerHTML = response.data;
            // Breve attesa per il rendering
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // 3. Inizializza la chat
        if (!AppState.chatInitialized) {
            await initChatSystem();
            AppState.chatInitialized = true;
        }

        // 4. Aggiorna lo stato
        AppState.navigateTo('chat');

    } catch (error) {
        console.error('Chat error:', error);
        document.getElementById('chatSection').innerHTML = `
            <div class="alert alert-danger">
                Errore nel caricamento: ${error.message}
                <button onclick="handleChatClick(this)" 
                        class="btn btn-sm btn-outline-danger ms-2">
                    Riprova
                </button>
            </div>
        `;
    } finally {
        button.innerHTML = originalHtml;
        button.disabled = false;
    }
}

async function handleLoginClick() {
    if (document.getElementById('loginFormContainer').classList.contains('d-none')) {
        await showAuthForms();
    }
    toggleForms(true);
    closeMobileMenu();
}

async function handleRegisterClick() {
    if (document.getElementById('registerFormContainer').classList.contains('d-none')) {
        await showAuthForms();
    }
    toggleForms(false);
    closeMobileMenu();
}

async function handleLogoutClick(button) {
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logout...';
    button.disabled = true;

    try {
        await logout();
    } finally {
        button.innerHTML = 'Logout';
        button.disabled = false;
    }
}

async function handleDbLoad(button) {
    if (button.disabled) {
        showAlert('Accesso negato', 'warning');
        return;
    }

    const originalText = button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Caricamento...';
    button.disabled = true;

    showAlert('Operazione in corso...', 'info', 10000);

    try {
        const {data} = await axios.post('/admin/upload-db', {}, {
            withCredentials: true
        });
        showAlert(data.message || 'Database caricato!', 'success');
    } catch (error) {
        console.error('DB load error:', error);
        showAlert(error.response?.data?.message || 'Errore durante il caricamento', 'danger');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// =============================================
// GESTIONE FILM E CAROSELLO
// =============================================
async function showFilmDetails(filmId) {
    // Se c'è già una richiesta attiva per questo film, ritorna la sua promise
    if (AppState._activeFilmRequests[filmId]) {
        return AppState._activeFilmRequests[filmId];
    }

    try {
        // Crea e memorizza la promise della richiesta
        AppState._activeFilmRequests[filmId] = (async () => {
            document.getElementById('carouselSection').classList.add('d-none');
            document.getElementById('searchResultsSection').classList.add('d-none');
            document.getElementById('filmDetailSection').classList.remove('d-none');
            document.getElementById('filmLoadingSpinner').style.display = 'flex';
            document.getElementById('filmContent').style.display = 'none';

            const response = await axios.get(`/film/${filmId}`, {
                timeout: 15000,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });

            if (response.status !== 200) throw new Error('Film non trovato');

            populateFilmData(response.data);
            document.getElementById('filmLoadingSpinner').style.display = 'none';
            document.getElementById('filmContent').style.display = 'block';
        })();

        return await AppState._activeFilmRequests[filmId];
    } catch (error) {
        console.error('Errore caricamento film:', error);
        // In caso di errore, resetta lo stato
        this._lastFilmNavigation.inProgress = false;
        throw error; // Rilancia l'errore per gestione esterna
        let errorMessage = 'Errore nel caricamento del film';
        if (error.response) {
            // Errore con risposta dal server (status code 4xx/5xx)
            errorMessage += `: ${error.response.data.error || error.response.statusText}`;
        } else if (error.request) {
            // La richiesta è stata fatta ma non c'è stata risposta
            errorMessage = 'Il server non risponde - timeout raggiunto';
        } else {
            // Errore durante la configurazione della richiesta
            errorMessage += `: ${error.message}`;
        }

        document.getElementById('filmLoadingSpinner').innerHTML = `
            <div class="alert alert-danger">
                ${errorMessage}
                <button onclick="location.reload()" class="btn btn-sm btn-outline-danger ms-3">Ricarica</button>
            </div>
        `;
    }finally{
        // Pulisci la richiesta completata
        delete AppState._activeFilmRequests[filmId];
    }
}

function populateFilmData(film) {
    // Dati base
    const posterContainer = document.getElementById('filmPosterContainer') ||
        document.getElementById('filmPoster').parentNode;

    // Svuota il container
    posterContainer.innerHTML = '';

    if (film.poster?.link || film.posterUrl) {
        const img = document.createElement('img');
        img.src = film.poster?.link || film.posterUrl;
        img.alt = film.movie?.name || film.title;
        img.className = 'img-fluid rounded-3 shadow';
        img.id = 'filmPoster';
        img.onerror = function () {
            posterContainer.innerHTML = '<div id="filmPoster" class="img-fluid rounded-3 shadow film-poster placeholder"></div>';
        };
        posterContainer.appendChild(img);
    } else {
        posterContainer.innerHTML = '<div id="filmPoster" class="img-fluid rounded-3 shadow film-poster placeholder"></div>';
    }
    document.getElementById('filmTitle').innerHTML =
        `${film.movie?.name || film.title} <small class="text-muted">(${film.movie?.date || film.movie?.year || film.year || 'N/D'})</small>`;
    document.getElementById('filmTagline').textContent = film.movie?.tagline || film.tagline || '';

    // Descrizione
    document.getElementById('filmDescription').textContent = film.movie?.description || film.description || 'Nessuna descrizione disponibile';

    // Rating e durata
    document.getElementById('filmRating').textContent = film.rating ? film.rating.toFixed(1) : 'N/D';
    document.getElementById('filmDuration').textContent = film.duration ||
        (film.movie?.minute ? `${Math.floor(film.movie.minute / 60)}h ${film.movie.minute % 60}m` : 'N/D');

    // Paesi
    const countriesElement = document.getElementById('filmCountries');
    if (countriesElement && film.countries?.length) {
        countriesElement.innerHTML = film.countries.map(c =>
            `<span class="badge bg-info me-1 mb-1">${c.countryName}</span>`
        ).join('');
    }

    // Cast (lista scorrevole)
    const actorsElement = document.getElementById('filmActors');
    if (actorsElement) {
        actorsElement.innerHTML = film.actors?.map(actor =>
            `<li class="list-group-item">
                <strong>${actor.actorName}</strong>
                <div class="text-muted small">${actor.characterName || 'Ruolo non specificato'}</div>
            </li>`
        ).join('') || '<li class="list-group-item">Nessun attore disponibile</li>';
    }

    // Crew (lista scorrevole)
    const crewElement = document.getElementById('filmCrew');
    if (crewElement) {
        crewElement.innerHTML = film.crew?.map(c =>
            `<li class="list-group-item">
                <strong>${c.name}</strong>
                <div class="text-muted small">${c.role}</div>
            </li>`
        ).join('') || '<li class="list-group-item">Nessun membro della crew disponibile</li>';
    }

    // Generi
    const genresElement = document.getElementById('filmGenres');
    if (genresElement && film.genres?.length) {
        genresElement.innerHTML = film.genres.map(g =>
            `<span class="badge bg-secondary">${g.genre}</span>`
        ).join(' ');
    }

    // Studios
    const studiosElement = document.getElementById('filmStudios');
    if (studiosElement && film.studios?.length) {
        studiosElement.innerHTML = film.studios.map(s =>
            `<span class="d-block">${s.studio}</span>`
        ).join('');
    }

    // Prima uscita
    const firstRelease = film.release?.length ? film.release.reduce((a, b) =>
        new Date(a.date) < new Date(b.date) ? a : b
    ) : null;

    if (firstRelease) {
        document.getElementById('filmFirstRelease').textContent =
            `${firstRelease.country} (${new Date(firstRelease.date).toLocaleDateString()})`;
    }

    // Releases (lista scorrevole)
    const releasesElement = document.getElementById('filmReleases');
    if (releasesElement) {
        releasesElement.innerHTML = film.release?.map(r => `
            <li class="list-group-item release-item">
                <div class="release-info">
                    <span class="release-country">${r.country}</span>
                    <div class="release-details">
                        <span>${new Date(r.date).toLocaleDateString()}</span>
                        ${r.type ? `<span class="release-type">${r.type}</span>` : ''}
                        ${r.rating ? `<span class="release-rating">${r.rating}</span>` : ''}
                    </div>
                </div>
            </li>
        `).join('') || '<li class="list-group-item">Nessuna data di uscita disponibile</li>';
    }
}

// =============================================
// GESTIONE RICERCA E AUTOCOMPLETE
// =============================================
// Aggiungi questa funzione per gestire la paginazione
function setupPaginationHandlers() {
    document.addEventListener('click', function (e) {
        const paginationLink = e.target.closest('.pagination-link');
        if (paginationLink) {
            e.preventDefault();

            const page = parseInt(paginationLink.dataset.page);
            const query = paginationLink.dataset.query;

            if (!isNaN(page) && query) {
                AppState.navigateTo('searchResults', {
                    query: query,
                    page: page
                });
            }
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchTypeDropdown = document.getElementById('searchTypeDropdown');
    const searchOptions = document.querySelectorAll('.search-option');

    // Gestione tipo di ricerca
    searchOptions.forEach(option => {
        option.addEventListener('click', function (e) {
            e.preventDefault();
            currentSearchType = this.dataset.type;
            searchTypeDropdown.textContent = this.textContent;
        });
    });

    // Gestione input con debounce
    searchInput.addEventListener('input', function () {
        if (currentSearchType !== 'film') return;

        clearTimeout(autocompleteTimeout);

        autocompleteTimeout = setTimeout(() => {
            const query = this.value.trim();
            if (query.length >= 2) {
                fetchAutocompleteResults(query);
            } else {
                hideAutocompleteDropdown();
            }
        }, 300);
    });

    // Mostra suggerimenti quando la searchbar riceve focus e ha già testo
    searchInput.addEventListener('focus', function () {
        const query = this.value.trim();
        if (query.length >= 2 && currentSearchType === 'film') {
            return fetchAutocompleteResults(query);
        }
    });

    // Gestione pulsante ricerca e invio
    searchButton.addEventListener('click', function () {
        hideAutocompleteDropdown();
        performSearch();
    });

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            hideAutocompleteDropdown();
            performSearch();
        }
    });

    // Chiudi dropdown al click esterno
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.input-group')) {
            hideAutocompleteDropdown();
        }
    });
}

async function fetchAutocompleteResults(query) {
    hideAutocompleteDropdown();

    const loadingDropdown = document.createElement('div');
    loadingDropdown.id = 'autocompleteLoading';
    loadingDropdown.className = 'autocomplete-dropdown';
    loadingDropdown.innerHTML = '<div class="autocomplete-loading">Caricamento suggerimenti</div>';
    document.querySelector('.input-group').appendChild(loadingDropdown);

    try {
        const response = await axios.get('/films/search/autocomplete', {
            params: {q: query},
            timeout: 13000
        });

        hideAutocompleteDropdown();

        if (document.getElementById('searchInput').value.trim() === query) {
            showAutocompleteDropdown(response.data || []);
        }

    } catch (error) {
        console.error('Autocomplete error:', error.message);
        hideAutocompleteDropdown();

        const errorDropdown = document.createElement('div');
        errorDropdown.id = 'autocompleteDropdown';
        errorDropdown.className = 'autocomplete-dropdown';
        errorDropdown.innerHTML = '<div class="autocomplete-loading">Errore nel caricamento</div>';
        document.querySelector('.input-group').appendChild(errorDropdown);
    }
}

function showAutocompleteDropdown(results) {
    const existingDropdown = document.getElementById('autocompleteDropdown');
    const dropdown = existingDropdown || document.createElement('div');
    dropdown.id = 'autocompleteDropdown';
    dropdown.className = 'autocomplete-dropdown';

    if (!results || results.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-loading">Nessun risultato trovato</div>';
    } else {
        dropdown.innerHTML = '';
        results.slice(0, 5).forEach(film => {
            const item = document.createElement('a');
            item.className = 'autocomplete-item';
            item.href = `/film/${film.id}`;

            item.innerHTML = `
                <div class="autocomplete-item-content">
                    ${film.posterLink ?
                `<img src="${film.posterLink}" alt="${film.name}" class="autocomplete-poster">` :
                `<div class="autocomplete-poster placeholder"></div>`}
                    <div class="autocomplete-info">
                        <div class="autocomplete-title">${film.name}</div>
                        <div class="autocomplete-year">${film.year || 'N/A'}</div>
                    </div>
                </div>
            `;

            item.addEventListener('click', async (e) => {
                e.preventDefault();
                hideAutocompleteDropdown();

                // Usiamo AppState per la navigazione ma manteniamo la logica di visualizzazione
                AppState.navigateTo('filmDetails', {filmId: film.id});

                // Mostra lo spinner
                document.getElementById('filmLoadingSpinner').style.display = 'flex';
                document.getElementById('filmContent').style.display = 'none';

                try {
                    const response = await axios.get(`/film/${film.id}`);
                    populateFilmData(response.data);

                    // Nascondi spinner e mostra contenuto
                    document.getElementById('filmLoadingSpinner').style.display = 'none';
                    document.getElementById('filmContent').style.display = 'block';

                } catch (error) {
                    console.error('Error loading film:', error);
                    document.getElementById('filmLoadingSpinner').innerHTML = `
                        <div class="alert alert-danger">
                            Errore nel caricamento del film
                            <button onclick="AppState.navigateTo('filmDetails', {filmId: '${film.id}'})" 
                                    class="btn btn-sm btn-outline-danger ms-2">
                                Riprova
                            </button>
                        </div>
                    `;
                }
            });

            dropdown.appendChild(item);
        });
    }

    if (!existingDropdown) {
        document.querySelector('.input-group').appendChild(dropdown);
    }
}

function hideAutocompleteDropdown() {
    const dropdown = document.getElementById('autocompleteDropdown');
    const loading = document.getElementById('autocompleteLoading');

    if (dropdown) dropdown.remove();
    if (loading) loading.remove();
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (query.length === 0) return;

    hideAutocompleteDropdown();

    if (currentSearchType === 'film') {
        AppState.navigateTo('searchResults', {query, page: 0});
    } else {
        window.location.href = `/search/actors?q=${encodeURIComponent(query)}`;
    }
}

async function updateSearchResults(query, page) {
    const searchResultsSection = document.getElementById('searchResultsSection');

    try {
        searchResultsSection.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Caricamento...</span>
                </div>
                <p class="mt-2">Caricamento risultati...</p>
            </div>
        `;

        const response = await axios.get(
            `/films/search/full?q=${encodeURIComponent(query)}&page=${page}`,
            {
                headers: {
                    'Accept': 'application/json, text/html',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        );

        searchResultsSection.innerHTML = response.data;
        setupFilmCardClickHandlers();

    } catch (error) {
        console.error('Error updating search results:', error);
        searchResultsSection.innerHTML = `
            <div class="alert alert-danger">
                Errore durante il caricamento dei risultati
                <button onclick="AppState.navigateTo('searchResults', { query: '${query}', page: ${page} })" 
                        class="btn btn-sm btn-outline-danger ms-2">
                    Riprova
                </button>
            </div>
        `;
    }
}

// Nuova funzione per gestire i click sulle card film
function setupFilmCardClickHandlers() {
    const handleFilmClick = (filmId) => {
        // Usa AppState invece di this
        if (AppState._lastFilmNavigation.filmId === filmId &&
            (Date.now() - AppState._lastFilmNavigation.timestamp) < 500) {
            return;
        }

        AppState._lastFilmNavigation = {
            filmId: filmId,
            timestamp: Date.now()
        };

        AppState.navigateTo('filmDetails', {filmId});
    };

    // Per il carosello
    document.querySelectorAll('.film-poster-container').forEach(poster => {
        poster.addEventListener('click', (e) => {
            const filmId = poster.getAttribute('data-film-id');
            handleFilmClick(filmId);
        });
    });

    // Per i risultati di ricerca
    document.addEventListener('click', function(e) {
        const filmCard = e.target.closest('.film-card');
        if (filmCard) {
            e.preventDefault();
            const filmId = filmCard.dataset.filmId;
            handleFilmClick(filmId);
        }
    });
}
// =============================================
// CHAT SYSTEM CLIENT
// =============================================
// Variabili globali per lo stato della chat
let socket = null;
let currentRoom = null;
function initChatSystem() {
    // Verifica che la sezione chat esista e sia visibile
    const chatSection = document.getElementById('chatSection');
    if (!chatSection || chatSection.classList.contains('d-none')) {
        console.log('Chat section non disponibile');
        return;
    }
    // Prendi i dati da sessionStorage invece che dal template
    const chatUser = JSON.parse(sessionStorage.getItem('chatUser'));
    if (!chatUser) {
        return showAuthForms();
    }
    // Aggiorna il badge utente
    const userBadge = document.getElementById('currentUserBadge');
    if (userBadge) {
        userBadge.textContent = `Utente: ${chatUser.username}`;
    }
    // Invia prima l'evento 'init' per autenticare
    if (!socket) {
        socket = io('/chat', {
            transports: ['websocket'],
            auth: { // Invia i dati di autenticazione direttamente
                userId: chatUser.id,
                username: chatUser.username
            }
        });

        socket.on('connect', () => {
            console.log('Connesso al namespace /chat');
            configureSocketEvents();
            refreshRoomsList();
        });
    }

    // Setup eventi solo per elementi esistenti
    setupUIEvents();

    if (currentRoom) {
        updateActiveRoomUI({
            id: currentRoom,
            name: `Stanza ${currentRoom}`,
            users: 1
        });
    }

    // Ascolta aggiornamenti stanze
    socket.on('chat:rooms_updated', refreshRoomsList);
    refreshRoomsList();
}

function configureSocketEvents() {
    socket.on('connect', () => {
        console.log('Connesso al namespace /chat');
    });

    socket.on('chat:room_created', () => {
        refreshRoomsList();
        showAlert('Nuova stanza disponibile!', 'info');
    });

    socket.on('chat:room_deleted', (data) => {
        refreshRoomsList();
        // Se eri nella stanza eliminata, resetta l'UI
        if (currentRoom === data.roomCode) {
            currentRoom = null;
            updateActiveRoomUI(null);
            document.getElementById('messagesContainer').innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-chat-square-text" style="font-size: 3rem;"></i>
                <p class="mt-3">Seleziona una stanza per iniziare a chattare</p>
            </div>
        `;
        }
    });

    socket.on('chat:room_update', (data) => {
        if (currentRoom === data.roomId) {
            updateRoomUsers(data.users, data.userCount);
        }
    });

    socket.on('chat:message', (data) => {
        if (data.roomId === currentRoom) {
            addMessageToUI(data.user.username, data.message, data.timestamp);
        }
    });

    socket.on('chat:user_joined', (user) => {
        addSystemMessage(`${user.username} si è unito alla chat`);
    });

    socket.on('chat:user_left', (user) => {
        addSystemMessage(`${user.username} ha lasciato la chat`);
    });
}
// Nuova funzione helper
function updateRoomUsers(users, count) {
    const roomUsersElement = document.getElementById('roomUsers');
    if (!roomUsersElement) return;

    const currentUser = JSON.parse(sessionStorage.getItem('chatUser'));

    roomUsersElement.innerHTML = `
        <div class="user-count">${count} utenti</div>
        ${users.map(user =>
        `<div class="user-badge ${user === currentUser?.username ? 'you' : ''}">
                ${user === currentUser?.username ? 'Tu' : user}
            </div>`
    ).join('')}
    `;
}

function setupUIEvents() {
    // Helper per aggiungere event listener con controllo null
    function safeAddListener(selector, event, handler) {
        const element = document.getElementById(selector);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Elemento ${selector} non trovato per l'evento ${event}`);
        }
    }

    // Click su una stanza esistente
    const roomsList = document.getElementById('roomsList');
    if (roomsList) {
        roomsList.addEventListener('click', (e) => {
            const roomItem = e.target.closest('.room-item');
            if (roomItem) {
                e.preventDefault();
                showJoinModal('', roomItem.querySelector('span').textContent.trim());
            }
        });
    }

    // Aggiungi listener solo se gli elementi esistono
    safeAddListener('createRoomBtn', 'click', showCreateModal);
    safeAddListener('sendMessageBtn', 'click', sendMessage);
    safeAddListener('messageInput', 'keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    safeAddListener('leaveRoomBtn', 'click', () => {
        leaveCurrentRoom();
        // Resetta l'UI dopo l'uscita
        currentRoom = null;
        updateActiveRoomUI(null);
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-chat-square-text" style="font-size: 3rem;"></i>
                    <p class="mt-3">Seleziona una stanza per iniziare a chattare</p>
                </div>
            `;
        }
    });

    // ---------- AGGIUNGI QUI TUTTA LA GESTIONE DEI MODAL ----------

    // Chiudi modali quando si clicca sulla X
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = this.closest('.modal-custom');
            hideModal(modal.id);
        });
    });

    // Chiudi modali quando si clicca su Annulla
    document.querySelectorAll('.btn-secondary.close-modal').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = this.closest('.modal-custom');
            hideModal(modal.id);
        });
    });

    // Chiudi quando si clicca sullo sfondo
    document.querySelectorAll('.modal-custom').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal(this.id);
            }
        });
    });

    // Previeni la chiusura quando si clicca sul contenuto
    document.querySelectorAll('.modal-content-custom').forEach(content => {
        content.addEventListener('click', e => {
            e.stopPropagation();
        });
    });

    // Gestione tasto ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-custom.show').forEach(modal => {
                hideModal(modal.id);
            });
        }
    });
}
// Mostra modal per unione

function showJoinModal(roomId = '', roomName = '') {
    const joinCodeInput = document.getElementById('joinRoomCode');
    joinCodeInput.value = ''; // <-- Imposta il valore vuoto invece di roomId

    // Aggiungi nome stanza se disponibile
    if (roomName) {
        document.querySelector('#joinRoomModal .modal-header h5').textContent =
            `Unisciti a "${roomName}"`;
    } else {
        document.querySelector('#joinRoomModal .modal-header h5').textContent =
            'Unisciti a stanza';
    }

    showModal('joinRoomModal');

    const confirmBtn = document.getElementById('confirmJoin');
    // Rimuovi il vecchio event listener per evitare duplicati
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    document.getElementById('confirmJoin').onclick = () => {
        const code = joinCodeInput.value.trim();
        if (code) {
            joinOrCreateRoom(code);
            hideModal('joinRoomModal');
        } else {
            showAlert('Inserisci un codice stanza valido', 'warning');
        }
    };
}
// Funzioni per gestire i modali
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        const input = modal.querySelector('input');
        if (input) input.focus();
    }, 10);
}
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}


// Mostra modal per creazione stanza
// Funzioni specifiche per la chat
function showCreateModal() {
    const modal = document.getElementById('createRoomModal');
    const nameInput = document.getElementById('roomNameInput');
    const topicSelect = document.getElementById('roomTopicSelect');
    const codeInput = document.getElementById('roomCodeInput');
    const confirmBtn = document.getElementById('confirmCreateRoom');

    // Resetta i valori
    nameInput.value = '';
    topicSelect.value = '';
    codeInput.value = generateRoomCode();

    showModal('createRoomModal');

    // Rimuovi vecchi listener e clona il pulsante
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.replaceWith(newConfirmBtn);

    // Aggiungi nuovo listener
    newConfirmBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const topic = topicSelect.value;
        const roomCode = codeInput.value.trim() || generateRoomCode();

        if (!name || !topic) {
            showAlert('Nome e argomento sono obbligatori', 'danger');
            return;
        }

        // Qui dovrai modificare joinOrCreateRoom per accettare i nuovi parametri
        createNewRoom({
            name: name,
            topic: topic,
            code: roomCode
        });

        hideModal('createRoomModal');
    });
}
async function createNewRoom(roomData) {
    try {
        // 1. Prima crea la stanza nel database
        const response = await axios.post('/sio/chat/createRoom', {
            name: roomData.name,
            topic: roomData.topic,
            code: roomData.code
        }, {
            validateStatus: function (status) {
                return status >= 200 && status < 500; // Considera i 4xx come risposte valide
            }
        });

        if (response.data.success) {
            // 2. Poi unisciti alla stanza via Socket.IO
            joinOrCreateRoom(roomData.code || response.data.room.id, {
                name: roomData.name,
                topic: roomData.topic,
                isNew: true
            });

            showAlert(`Stanza "${roomData.name}" creata!`, 'success');
        } else {
            throw new Error(response.data.error || 'Errore sconosciuto');
        }
    } catch (error) {
        console.error('Errore creazione stanza:', error);
        showAlert(`Errore: ${error.response?.data?.error || error.message}`, 'danger');
    }
}
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Funzione per uscire da una stanza
async function leaveCurrentRoom() {
    if (!socket || !currentRoom) return;

    return new Promise((resolve) => {
        socket.emit('chat:leave', currentRoom, (response) => {
            if (response?.success) {
                addSystemMessage(`Hai lasciato la stanza`);
                showAlert('Sei uscito dalla stanza', 'success');
                currentRoom = null;
                updateActiveRoomUI(null); // Questo ora resetta anche roomUsers
            } else {
                const errorMsg = response?.error || 'Errore durante l\'uscita';
                showAlert(errorMsg, 'danger');
            }
            resolve(response?.success);
        });
    });
}
// Unione o creazione stanza
function joinOrCreateRoom(roomCode, roomMeta = {}) {
    if (!socket) {
        console.error('Socket non inizializzato!');
        return;
    }
    // Resetta l'UI prima di entrare in una nuova stanza
    if (currentRoom) {
        document.getElementById('messagesContainer').innerHTML = '';
    }
    leaveCurrentRoom(); // Esci dalla stanza corrente prima di entrare in una nuova
    socket.emit('chat:join_or_create', {
        code: roomCode,
        name: roomMeta.name || `Stanza ${roomCode}`,
        topic: roomMeta.topic || 'generale'
    }, (response) => {
        if (response?.success) {
            currentRoom = roomCode;
            updateActiveRoomUI(response.roomData);

            // MODIFICA QUI - Nuovo formato messaggio
            const msg = roomMeta.isNew ?
                `Hai creato la stanza "${response.roomData.name}" (Codice: ${roomCode})` :
                `Ti sei unito alla stanza "${response.roomData.name}" (Codice: ${roomCode})`;

            addSystemMessage(msg);
        } else {
            const errorMsg = response?.error || 'Errore di connessione';
            showAlert(errorMsg, 'danger');
        }
    });
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (message && currentRoom && socket) {
        socket.emit('chat:message', {
            roomId: currentRoom,
            message: message
        }, (ack) => {
            if (!ack || !ack.success) {
                console.error('Errore nell\'invio del messaggio');
                showAlert('Errore nell\'invio del messaggio', 'danger');
            }
        });
        input.value = '';
    }
}
// Helper per aggiungere un messaggio all'UI
function addMessageToUI(username, text) {
    const messagesDiv = document.getElementById('messagesContainer');
    messagesDiv.innerHTML += `
        <div class="message">
            <strong>${username}:</strong> ${text}
        </div>
    `;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
    const messagesDiv = document.getElementById('messagesContainer');
    messagesDiv.innerHTML += `
        <div class="system-message text-muted small">${text}</div>
    `;
}
async function refreshRoomsList() {
    try {
        const response = await axios.get('/sio/chat/active-rooms');
        const rooms = Array.isArray(response.data) ? response.data : [];

        const roomsList = document.getElementById('roomsList');
        roomsList.innerHTML = rooms.map(room => `
    <a href="#" class="list-group-item list-group-item-action room-item"
       data-room-id="${room.id}" data-room-type="${room.type}">
        <div class="d-flex justify-content-between align-items-center">
            <span>
                <i class="bi bi-${roomIcon(room.type)} me-2"></i>
                ${room.name} <small class="text-muted">(${room.type})</small>
            </span>
        </div>
    </a>
`).join('');
    } catch (error) {
        console.error('Errore caricamento stanze:', error);
        document.getElementById('roomsList').innerHTML = `
            <div class="text-muted p-2">Errore nel caricamento delle stanze</div>
        `;
    }
}


function updateActiveRoomUI(roomData) {
    const leaveBtn = document.getElementById('leaveRoomBtn');
    const inputContainer = document.getElementById('messageInputContainer');
    const currentRoomTitle = document.getElementById('currentRoomTitle');
    const roomUsersElement = document.getElementById('roomUsers');

    if (roomData) {
        leaveBtn.classList.remove('d-none');
        currentRoomTitle.textContent = `${roomData.name} (Codice: ${roomData.id})`;
        inputContainer.classList.remove('d-none');
        inputContainer.querySelector('input').disabled = false;
        inputContainer.querySelector('button').disabled = false;

        if (roomUsersElement) {
            const currentUser = JSON.parse(sessionStorage.getItem('chatUser'));
            roomUsersElement.innerHTML = `
                <div class="user-count">${roomData.userCount} utenti</div>
                ${roomData.users.map(user =>
                `<div class="user-badge ${user === currentUser?.username ? 'you' : ''}">
                        ${user === currentUser?.username ? 'Tu' : user}
                    </div>`
            ).join('')}
            `;
        }
    } else {
        leaveBtn.classList.add('d-none');
        currentRoomTitle.textContent = 'Seleziona una stanza';
        inputContainer.classList.add('d-none');

        if (roomUsersElement) {
            roomUsersElement.innerHTML = '';
        }
    }
}
// Helper per l'icona della stanza (da implementare in base alle tue esigenze)
function roomIcon(type) {
    const icons = {
        'film': 'film',
        'actor': 'person',
        'crew': 'person-gear',
        'character': 'person-badge'
    };
    return icons[type] || 'chat';
}
// =============================================
// STATO DELL'APPLICAZIONE E GESTIONE VISTE
// =============================================
const AppState = {
    _popstateLock: false,
    _isHandlingPopstate: false,
    _lastHandledState: null,
    _filmNavigationLock: false,
    _filmNavigationCount: 0,
    currentView: 'carousel',
    previousView: null,
    currentFilmId: null,
    searchQuery: null,
    searchType: 'film',
    currentPage: 0,
    currentRoom: null,
    chatInitialized: false,
    _activeFilmRequests: {}, // Traccia le richieste attive

    _lastFilmNavigation: {
        filmId: null,
        timestamp: 0,
    },

    navigateTo: function (view, params = {}, replace = false) {
        this.previousView = this.currentView;
        this.currentView = view;

        switch (view) {
            case 'carousel':
                this.showCarousel();
                break;
            case 'filmDetails':
                this.currentFilmId = params.filmId;
                this.showFilmDetails(params.filmId);
                break;
            case 'searchResults':
                this.searchQuery = params.query;
                this.currentPage = params.page || 0;
                this.showSearchResults(params.query, params.page);
                break;
            case 'chat':
                this.showChat();
                break;
        }

        this.updateHistory(view, params, replace);
    },

    showChat: async function() {
        // Nascondi tutte le altre view prima
        document.getElementById('carouselSection').classList.add('d-none');
        document.getElementById('filmDetailSection').style.display = 'none';
        document.getElementById('searchResultsSection').classList.add('d-none');

        // Mostra la chat
        document.getElementById('chatSection').classList.remove('d-none');

        if (!this.chatInitialized) {
            await initChatSystem();
            this.chatInitialized = true;
        }
    },

    showCarousel: async function () {
        const carouselSection = document.getElementById('carouselSection');
        const previousContent = carouselSection.innerHTML;
        carouselSection.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">Caricamento...</span>
            </div>
            <p class="mt-3">Caricamento film...</p>
        </div>
    `;
        // Mostra la sezione
        carouselSection.classList.remove('d-none');
        document.getElementById('filmDetailSection').style.display = 'none';
        document.getElementById('searchResultsSection').classList.add('d-none');
        document.getElementById('chatSection').classList.add('d-none');

        try {
            // Ricarica i film solo se necessario
            if (document.querySelectorAll('.film-poster-container').length === 0) {
                const response = await axios.get('/');
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.data, 'text/html');
                const newCarousel = doc.getElementById('carouselSection');

                if (newCarousel) {
                    carouselSection.innerHTML = newCarousel.innerHTML;
                    setupFilmCardClickHandlers();
                } else {
                    carouselSection.innerHTML = previousContent;
                }
            }
        } catch (error) {
            console.error('Error reloading carousel:', error);
            carouselSection.innerHTML = `
            <div class="alert alert-danger">
                Errore nel caricamento del carosello
                <button onclick="AppState.navigateTo('carousel')" 
                        class="btn btn-sm btn-outline-danger ms-2">
                    Riprova
                </button>
            </div>
        `;
        }
    },

    showFilmDetails: async function (filmId) {
        document.getElementById('carouselSection').classList.add('d-none');
        document.getElementById('searchResultsSection').classList.add('d-none');
        document.getElementById('filmDetailSection').style.display = 'block';
        document.getElementById('chatSection').classList.add('d-none');

        await showFilmDetails(filmId);
    },

    showSearchResults: function (query, page = 0) {
        document.getElementById('carouselSection').classList.add('d-none');
        document.getElementById('filmDetailSection').style.display = 'none';
        document.getElementById('searchResultsSection').classList.remove('d-none');
        document.getElementById('chatSection').classList.add('d-none');

        updateSearchResults(query, page);
    },


    updateHistory: function(view, params, replace = false) {
        // Validazione minima
        if (view === 'searchResults' && !params.query) {
            console.error('Search navigation requires query');
            return;
        }
        if (view === 'filmDetails' && !params.filmId) {
            console.error('Film details navigation requires filmId');
            return;
        }

        let url, state;
        switch (view) {
            case 'carousel':
                url = '/';
                state = {view: 'carousel'};
                break;
            case 'filmDetails':
                url = `/film/${params.filmId}`;
                state = {
                    view: 'filmDetails',
                    filmId: params.filmId,
                    previousState: this.currentView === 'searchResults' ? {
                        view: 'searchResults',
                        query: this.searchQuery,
                        page: this.currentPage
                    } : null
                };
                break;
            case 'searchResults':
                url = `/films/search/full?q=${encodeURIComponent(params.query)}&page=${params.page || 0}`;
                state = {
                    view: 'searchResults',
                    query: params.query,
                    page: params.page || 0
                };
                break;
            case 'chat':
                url = '/sio/chat';
                state = {
                    view: 'chat',
                    previousState: {
                        view: this.currentView,
                        ...(this.currentView === 'searchResults' && {
                            query: this.searchQuery,
                            page: this.currentPage
                        }),
                        ...(this.currentView === 'filmDetails' && {
                            filmId: this.currentFilmId
                        })
                    }
                };
                break;
        }

        if (url && state) {
            if (replace) {
                window.history.replaceState(state, '', url);
            } else {
                window.history.pushState(state, '', url);
            }
        }
    },

    handlePopState: function(event) {
        if (this._isHandlingPopstate) return;
        this._isHandlingPopstate = true;

        try {
            const url = new URL(window.location.href);

            // Caso speciale: tornando alla home
            if (url.pathname === '/') {
                this._navigateToCarousel();
                return;
            }

            // Se siamo sulla chat e torniamo indietro
            if (this.currentView === 'chat' && url.pathname !== '/sio/chat') {
                if (event.state?.previousState) {
                    // Usa lo stato precedente salvato
                    const prev = event.state.previousState;
                    switch(prev.view) {
                        case 'carousel':
                            this._navigateToCarousel();
                            break;
                        case 'searchResults':
                            this._navigateToSearchResults(prev.query, prev.page);
                            break;
                        case 'filmDetails':
                            this._navigateToFilmDetails(prev.filmId);
                            break;
                        default:
                            this._navigateToCarousel();
                    }
                } else {
                    this._navigateToCarousel();
                }
                return;
            }

            // Gestione normale degli stati
            if (event.state) {
                switch(event.state.view) {
                    case 'carousel':
                        this._navigateToCarousel();
                        break;
                    case 'filmDetails':
                        this._navigateToFilmDetails(event.state.filmId);
                        break;
                    case 'searchResults':
                        this._navigateToSearchResults(event.state.query, event.state.page);
                        break;
                    case 'chat':
                        this._navigateToChat();
                        break;
                }
            } else {
                // Fallback per URL diretto
                if (url.pathname.startsWith('/film/')) {
                    const filmId = url.pathname.split('/')[2];
                    this._navigateToFilmDetails(filmId);
                } else if (url.pathname.startsWith('/films/search')) {
                    const query = url.searchParams.get('q');
                    const page = parseInt(url.searchParams.get('page')) || 0;
                    this._navigateToSearchResults(query, page);
                } else if (url.pathname === '/sio/chat') {
                    this._navigateToChat();
                } else {
                    this._navigateToCarousel();
                }
            }
        } catch (error) {
            console.error('Navigation error:', error);
            this._navigateToCarousel();
        } finally {
            this._isHandlingPopstate = false;
        }
    },

    //helper per la navigazione alla chat
    _navigateToChat: function() {
        if (this.currentView === 'chat') return;

        this.currentView = 'chat';
        this.showChat();
    },

// Aggiungi queste funzioni helper a AppState:
    _navigateToFilmDetails: function(filmId) {
        if (this.currentView === 'filmDetails' && this.currentFilmId === filmId) {
            return;
        }

        this.currentView = 'filmDetails';
        this.currentFilmId = filmId;
        this.showFilmDetails(filmId);
    },

    _navigateToSearchResults: function(query, page) {
        if (this.currentView === 'searchResults' &&
            this.searchQuery === query &&
            this.currentPage === page) return;

        this.currentView = 'searchResults';
        this.searchQuery = query;
        this.currentPage = page;
        this.showSearchResults(query, page);
    },

    _navigateToCarousel: function() {
        if (this.currentView === 'carousel') return;

        this.currentView = 'carousel';
        this.showCarousel();
    },
};

// Inizializzazione
window.addEventListener('popstate', (event) => {
    AppState.handlePopState(event);
});
// =============================================
// INIT DELL'APPLICAZIONE
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        hideAllSections();
        document.getElementById('loaderSection').classList.remove('hidden-section');

        // Setup eventi
        setupNavbarEvents();
        setupSearch();
        setupFilmCardClickHandlers();
        setupPaginationHandlers();

        const isAuthenticated = await checkAuthState();
        if (isAuthenticated) {
            showDashboard();

            // Salva lo stato iniziale nella history
            if (window.location.pathname === '/' && !history.state) {
                history.replaceState({ view: 'carousel' }, '', '/');
            }

            // Determina la vista iniziale in base all'URL
            if (window.location.pathname === '/sio/chat') {
                AppState.navigateTo('chat', {}, true); // ora è valido
            } else if (window.location.pathname.startsWith('/film/')) {
                const filmId = window.location.pathname.split('/')[2];
                AppState.navigateTo('filmDetails', {filmId}, true);
            } else if (window.location.pathname.startsWith('/films/search')) {
                const urlParams = new URLSearchParams(window.location.search);
                AppState.navigateTo('searchResults', {
                    query: urlParams.get('q'),
                    page: parseInt(urlParams.get('page')) || 0
                }, true);
            } else {
                AppState.navigateTo('carousel', {}, true);
            }
        } else {
            await showAuthForms();
        }
    } catch (error) {
        console.error('Init error:', error);
        showAlert(`Errore iniziale: ${error.message}`, 'danger');
        await showAuthForms();
    } finally {
        document.getElementById('loaderSection').classList.add('hidden-section');
    }
});