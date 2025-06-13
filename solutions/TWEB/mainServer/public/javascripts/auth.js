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
    document.getElementById('advancedSearchSection').classList.add('hidden-section');
}

function showDashboard() {
    hideAllSections();
    document.getElementById('dashboardSection').classList.remove('hidden-section');
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
    // 1. Recupera il tabId (DEVE esistere grazie all'init)
    const tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
        console.error('Mancanza tabId nello sessionStorage!');
        await updateUIForUnauthenticated();
        return false;
    }
    console.log('Stato sessioni attive:', {
        tabId: sessionStorage.getItem('tabId'),
        sessionUser: JSON.parse(sessionStorage.getItem('chatUser') || 'null')
    });

    try {
        // 2. Chiamata API con tabId
        const {data} = await axios.get('/auth/check', {
            params: {
                t: Date.now(),
                tabId: tabId
            },
            headers: {'Cache-Control': 'no-cache'}
        });

        // 3. Verifica autenticazione e coerenza tabId (MODIFICA MINIMA)
        if (data.authenticated) {
            if (data.user?.tabId !== tabId) {
                console.warn('Disallineamento tabId - accesso negato', {
                    sessionTabId: data.user?.tabId,
                    localTabId: tabId,
                    note: 'La sessione originale rimane attiva'
                });
                console.log('Dati ricevuti da /auth/check:', {
                    authenticated: data.authenticated,
                    user: data.user,
                    expectedTabId: tabId
                });
                // Modificato: rimossa chiamata a forceLogout()
                await updateUIForUnauthenticated();
                sessionStorage.removeItem('chatUser');
                return false;
            }

            // Resto invariato
            updateUIForAuthenticatedUser(data.user);
            sessionStorage.setItem('chatUser', JSON.stringify({
                id: data.user.id,
                username: data.user.username,
                tabId: data.user.tabId
            }));
            return true;
        }

        // 4. Comportamento esistente per non autenticato
        await updateUIForUnauthenticated();
        sessionStorage.removeItem('chatUser');
        return false;

    } catch (error) {
        console.error('Auth check failed:', {
            error: error.response?.data || error.message,
            tabId: tabId
        });
        await updateUIForUnauthenticated();
        sessionStorage.removeItem('chatUser');
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

    showDashboard();
    // MOSTRA IL CAROSELLO
    const carouselSection = document.getElementById('carouselSection');
    if (carouselSection) {
        carouselSection.classList.remove('d-none'); // Rimuove la classe che nasconde il carosello
    }
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

    // 1. Pulisci i form esistenti clonandoli
    const cleanForm = (formId) => {
        const form = document.getElementById(formId);
        if (form) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            return newForm;
        }
        return null;
    };

    const loginForm = cleanForm('loginForm');
    const registerForm = cleanForm('registerForm');

    // 2. Setup degli eventi (identico al tuo codice originale)
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
        // AGGIUNGI IL TAB ID ALLA RICHIESTA (per il backend)
        let tabId = sessionStorage.getItem('tabId');
        let attempts = 0;
        while (!tabId && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 100));
            tabId = sessionStorage.getItem('tabId');
            attempts++;
        }

        if (!tabId) {
            tabId = crypto.randomUUID();
            sessionStorage.setItem('tabId', tabId);
            console.warn('Fallback: generato tabId al volo', tabId);
        }

        const requestData = {
            ...data,
            tabId: tabId // Associa la tab corrente al login
        };
        const {data: result} = await axios.post(endpoint, requestData);
        if (result.success) {
            if (endpoint === '/auth/login') {
                // Salva SOLO i dati necessari in sessionStorage
                sessionStorage.setItem('chatUser', JSON.stringify({
                    id: result.user.id,
                    username: result.user.username,
                    tabId: tabId
                }));
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
        const target = e.target.closest('#loginBtn, #registerBtn, #logoutBtn, #loadDbBtn, #chatBtn, #advancedSearchBtn');
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
                case 'advancedSearchBtn':
                    await handleAdvancedSearchClick(target);
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

async function handleAdvancedSearchClick(button) {
    console.log(`Handling click for button: ${button.id}`); // Debug

    const section = document.getElementById('advancedSearchSection');
    if (!section) {
        console.error("advancedSearchSection non trovato!");
        return;
    }

    // Se il contenuto è già visibile, non fare nulla
    if (section.querySelector('.advanced-search-container') &&
        !section.classList.contains('d-none') &&
        !section.classList.contains('hidden-section')) {
        console.log("La sezione è già visibile, ignorando...");
        return;
    }

    // Mostra lo spinner
    const originalHtml = button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    button.disabled = true;

    try {
        section.classList.remove('d-none', 'hidden-section');

        // Carica il form solo se non è già presente
        if (!section.querySelector('.advanced-search-container')) {
            console.log("Caricamento form avanzato...");
            const response = await axios.get('/advanced-search');
            section.innerHTML = response.data;
        }

        initAdvancedSearch();
        AppState.navigateTo('advancedSearch');

    } catch (error) {
        console.error('Errore:', error);
        section.innerHTML = `
            <div class="alert alert-danger">
                Errore: ${error.message}
                <button onclick="handleAdvancedSearchClick(this)" 
                        class="btn btn-sm btn-outline-danger ms-2">
                    Riprova
                </button>
            </div>`;
    } finally {
        button.innerHTML = originalHtml;
        button.disabled = false;
    }
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
    } finally {
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
    loadFilmOscars(film.movie?.name, film.movie?.date || film.movie?.year);
}

async function loadFilmOscars(filmName, filmYear) {
    // Converti l'anno in modo robusto
    let year = null;
    if (filmYear) {
        if (typeof filmYear === 'number' && !isNaN(filmYear)) {
            year = filmYear;
        } else if (typeof filmYear === 'string') {
            const dateObj = new Date(filmYear);
            year = isNaN(dateObj) ? null : dateObj.getFullYear();
        }
    }

    console.log("[DEBUG] Anno elaborato:", {
        input: filmYear,
        output: year,
        type: typeof filmYear
    });

    try {
        const oscarsSection = document.getElementById('oscarsSection');
        if (!oscarsSection) {
            console.log("[OSCARS DEBUG] Sezione Oscar non trovata nel DOM");
            return;
        }

        console.log("[DEBUG INPUT]", {
            filmName,
            filmYear,
            typeofFilmName: typeof filmName,
            typeofFilmYear: typeof filmYear
        });

        const requestBody = {
            filmName: String(filmName),
            year: typeof filmYear === 'number' ? filmYear :
                (filmYear ? new Date(filmYear).getFullYear() : null)
        };

        console.log("[DEBUG REQUEST BODY]", {
            requestBody,
            stringified: JSON.stringify(requestBody)
        });

        console.log("[OSCARS DEBUG] Invio richiesta con body:", {
            rawFilmName: filmName,
            rawFilmYear: filmYear,
            processedYear: requestBody.year,
            fullRequestBody: JSON.parse(JSON.stringify(requestBody))
        });

        // CHIAMATA AXIOS
        const response = await axios.post('http://localhost:3003/api/oscars/search', requestBody, {
            headers: {'Content-Type': 'application/json'},
            timeout: 15000
        });

        console.log("[DEBUG RESPONSE]", {
            status: response.status,
            headers: response.headers,
            config: response.config
        });

        const oscars = response.data;
        console.log("[DEBUG RESPONSE DATA]", {
            rawData: oscars,
            dataType: Array.isArray(oscars) ? 'array' : typeof oscars,
            length: Array.isArray(oscars) ? oscars.length : 'N/A'
        });

        if (!Array.isArray(oscars)) {
            console.error("[OSCARS ERROR] Formato risposta non valido, atteso array, ricevuto:", typeof oscars);
            throw new Error("Formato dati non valido");
        }

        renderOscars(oscars);

    } catch (error) {
        console.error("[OSCARS ERROR] Dettaglio errore:", {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
            fullError: error.response ? {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            } : 'No response received'
        });
    } finally {
        const loadingElement = document.getElementById('oscarsLoading');
        if (loadingElement) loadingElement.classList.add('d-none');
        console.log("[OSCARS DEBUG] Caricamento completato (con o senza successo)");
    }
}

function renderOscars(oscars) {
    // Cerca gli elementi nel filmDetailSection invece che globalmente
    const filmSection = document.getElementById('filmDetailSection');
    if (!filmSection) {
        console.error('Sezione film non trovata');
        return;
    }

    const container = document.getElementById('oscarsList');
    const loadingElement = document.getElementById('oscarsLoading');

    // Nascondi sempre il loader prima di procedere
    if (loadingElement) loadingElement.classList.add('d-none');

    if (!container) {
        console.error('Elemento oscarsList non trovato', {
            containerExists: !!container,
            filmSectionHTML: filmSection.innerHTML
        });
        return;
    }

    // Pulisci la lista esistente
    container.innerHTML = '';

    if (oscars?.length > 0) {
        // Ci sono Oscar da mostrare
        container.classList.remove('d-none');

        oscars.forEach(oscar => {
            const item = document.createElement('li');
            item.className = `list-group-item ${oscar.isWinner ? 'oscar-winner' : ''}`;
            item.innerHTML = `
                <strong>${oscar.category}</strong>
                <div class="text-muted small">
                    ${oscar.year} • 
                    ${oscar.isWinner ? '🏆 Vincitore' : 'Nomina'}
                    ${oscar.nominee ? ` • ${oscar.nominee}` : ''}
                </div>
            `;
            container.appendChild(item);
        });
    } else {
        // Nessun Oscar trovato - mostra messaggio direttamente nella lista
        container.classList.remove('d-none'); // Mostra il container

        const noResultsItem = document.createElement('li');
        noResultsItem.className = 'list-group-item text-muted';
        noResultsItem.textContent = 'Nessun premio Oscar trovato';
        container.appendChild(noResultsItem);
    }
}
// =============================================
// GESTIONE RICERCA E AUTOCOMPLETE
// =============================================
// Aggiungi questa funzione per gestire la paginazione
function setupPaginationHandlers() {
    document.addEventListener('click', function (e) {
        const link = e.target.closest('.pagination-link');
        if (!link) return;

        e.preventDefault();
        const page = parseInt(link.dataset.page);
        const query = link.dataset.query;

        // Gestione separata per ricerche full e advanced
        if (query.startsWith('advanced:')) {
            const params = new URLSearchParams(query.replace('advanced:', ''));
            params.set('page', page);
            AppState.navigateTo('searchResults', {query, page});
        } else {

            AppState.navigateTo('searchResults', {query, page});
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

function setupAdvancedSearchButtons() {
    console.log("Setting up advanced search buttons...");

    // Delegazione degli eventi per gestire i click
    document.addEventListener('click', async (e) => {
        if (e.target.id === 'modifyFilmFiltersBtn' || e.target.id === 'modifyReviewFiltersBtn') {
            console.log(`Button ${e.target.id} clicked`); // Debug
            await handleAdvancedSearchClick(e.target); // Passa il bottone cliccato
        }
    });
}


async function updateSearchResults(query, page) {
    const searchResultsSection = document.getElementById('searchResultsSection');
    // Validazione iniziale
    if (!query) {
        console.error('Query parameter is required');
        searchResultsSection.innerHTML = `
            <div class="alert alert-danger">
                Parametro di ricerca mancante
                <button onclick="AppState.navigateTo('carousel')" 
                        class="btn btn-sm btn-outline-danger ms-2">
                    Torna alla home
                </button>
            </div>
        `;
        return;
    }
    try {
        // Mostra loader
        searchResultsSection.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2">Caricamento...</p>
            </div>
        `;

        // Costruisci URL corretto con validazione

        let apiUrl;
        if (typeof query === 'string' && query.startsWith('advanced:')) {
            const params = new URLSearchParams(query.replace('advanced:', ''));
            params.set('page', page);
            params.set('searchType', 'films'); // Aggiungi esplicitamente
            apiUrl = `/search/advanced?${params}`;
        } else {
            apiUrl = `/films/search/full?q=${encodeURIComponent(query || '')}&page=${page}`;
        }

        const response = await axios.get(apiUrl);
        searchResultsSection.innerHTML = response.data;
        // Aggiorna stato paginazione
        document.querySelectorAll('.page-item').forEach(item => {
            item.classList.remove('active', 'disabled');
            const itemPage = parseInt(item.querySelector('a')?.dataset.page);

            if (itemPage === page) {
                item.classList.add('active');
            }
            if (item.querySelector('a')?.ariaLabel === 'Previous' && page === 0) {
                item.classList.add('disabled');
            }
            if (item.querySelector('a')?.ariaLabel === 'Next' && page === parseInt(response.data.totalPages) - 1) {
                item.classList.add('disabled');
            }
        });
        //initAdvancedSearchHandlers();
    } catch (error) {
        searchResultsSection.innerHTML = `
            <div class="alert alert-danger">
                Errore durante il caricamento
                <button onclick="updateSearchResults('${query}', ${page})" 
                        class="btn btn-sm btn-outline-danger ms-2">
                    Riprova
                </button>
            </div>
        `;
        console.error('Search error:', error);
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
    document.addEventListener('click', function (e) {
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

    // ---------- GESTIONE DEI MODAL ----------

    // Chiudi modali quando si clicca sulla X
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const modal = this.closest('.modal-custom');
            hideModal(modal.id);
        });
    });

    // Chiudi modali quando si clicca su Annulla
    document.querySelectorAll('.btn-secondary.close-modal').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const modal = this.closest('.modal-custom');
            hideModal(modal.id);
        });
    });

    // Chiudi quando si clicca sullo sfondo
    document.querySelectorAll('.modal-custom').forEach(modal => {
        modal.addEventListener('click', function (e) {
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
// SEZIONE RICERCA AVANZATA
// =============================================
window.initAdvancedSearch = function () {
    const searchTypeSelect = document.getElementById('searchTypeSelect');
    const searchForm = document.getElementById('advancedSearchForm');
    const filtersContainer = document.getElementById('dynamicFilters');

    if (!searchTypeSelect || !searchForm || !filtersContainer) {
        console.error('Elementi principali non trovati');
        return;
    }
    // Controllo se già inizializzato
    if (searchForm.dataset.initialized === 'true') {
        return;
    }
    searchForm.dataset.initialized = 'true';
    // Templates
    const filmFiltersTemplate = document.getElementById('filmFiltersTemplate');
    const reviewFiltersTemplate = document.getElementById('reviewFiltersTemplate');

    // Funzione per aggiornare i filtri
    const updateFilters = (type) => {
        try {
            filtersContainer.innerHTML = '';
            updateSortOptions(type);
            switch (type) {
                case 'films':
                    if (filmFiltersTemplate) {
                        const content = document.importNode(filmFiltersTemplate.content, true);
                        filtersContainer.appendChild(content);
                        initFilmFilters()
                    }
                    break;

                case 'reviews':
                    if (reviewFiltersTemplate) {
                        const content = document.importNode(reviewFiltersTemplate.content, true);
                        filtersContainer.appendChild(content);
                        initReviewFilters();
                    }
                    break;

                default:
                    filtersContainer.innerHTML = '<p class="text-muted">Seleziona un tipo di ricerca</p>';
            }

        } catch (error) {
            console.error('Errore nel cambio filtri:', error);
            filtersContainer.innerHTML = `
                <div class="alert alert-danger">
                    Errore nel caricamento dei filtri
                </div>
            `;
        }
    };
    const updateSortOptions = (searchType) => {
        const sortBySelect = document.getElementById('sortBySelect');
        if (!sortBySelect) return;

        sortBySelect.innerHTML = '';

        if (searchType === 'films') {
            // Solo opzioni data per i film
            sortBySelect.innerHTML = `
            <option value="date_desc">Data rilascio (crescente)</option>
            <option value="date_asc">Data rilascio (decrescente)</option>
        `;
        } else if (searchType === 'reviews') {
            // Opzioni complete per le recensioni
            sortBySelect.innerHTML = `
            <option value="date_desc">Data (Più recenti prima)</option>
            <option value="date_asc">Data (Più vecchi prima)</option>
            <option value="rating_desc">Rating (Più alto prima)</option>
            <option value="rating_asc">Rating (Più basso prima)</option>
        `;
        }
    };

    // Inizializza i filtri per i film
    const initFilmFilters = () => {
        // Slider rating
        initRatingSlider('minRating');

        // Dropdown tipo ricerca film
        const dropdownItems = filtersContainer.querySelectorAll('.dropdown-item');
        const searchTypeLabel = filtersContainer.querySelector('#filmSearchTypeLabel');
        const searchTypeInput = filtersContainer.querySelector('input[name="filmSearchType"]');

        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const value = e.target.getAttribute('data-value');
                const text = e.target.textContent;
                searchTypeLabel.textContent = text;
                searchTypeInput.value = value;
            });
        });
    };

    // Inizializza i filtri per le recensioni
    const initReviewFilters = () => {
        initRatingSlider('reviewMinRating');
    };

    // Funzione helper per inizializzare gli slider di rating
    const initRatingSlider = (name) => {
        const slider = filtersContainer.querySelector(`input[name="${name}"]`);
        const valueDisplay = filtersContainer.querySelector(`input[name="${name}"]`).closest('.star-rating-slider').querySelector('.rating-value-display span');

        if (slider && valueDisplay) {
            // Aggiorna il valore iniziale
            valueDisplay.textContent = slider.value;

            // Aggiorna al cambiare del valore
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value;
            });
        }
    };

    // Esegue la ricerca avanzata
    const executeAdvancedSearch = async (e) => {
        e.preventDefault();

        const formData = new FormData(searchForm);
        const searchType = formData.get('searchType');
        // Aggiunta: Controllo campi obbligatori per la ricerca film
        if (searchType === 'films') {
            const filmQuery = formData.get('filmQuery')?.trim();
            const searchQuery = formData.get('filmSearchQuery')?.trim();

            if (!filmQuery && !searchQuery) {
                // Mostra alert di Bootstrap
                const alertHTML = `
                <div class="alert alert-warning alert-dismissible fade show mt-3" role="alert">
                    <strong>Attenzione!</strong> Specificare almeno uno tra il titolo del film e il termine di ricerca (attore, personaggio, etc.)
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;

                // Rimuovi eventuali alert precedenti
                const existingAlert = document.querySelector('#advancedSearchForm .alert');
                if (existingAlert) existingAlert.remove();

                // Inserisci il nuovo alert dopo il bottone di submit
                const submitButton = searchForm.querySelector('button[type="submit"]');
                submitButton.insertAdjacentHTML('afterend', alertHTML);

                return; // Blocca l'esecuzione della ricerca
            }
        }
        const params = {
            searchType,
            sortBy: formData.get('sortBy') || (searchType === 'films' ? 'date_desc' : 'rating_desc')
        };

        if (params.searchType === 'films') {
            params.filmQuery = formData.get('filmQuery');
            params.searchQuery = formData.get('filmSearchQuery');
            params.filmSearchType = formData.get('filmSearchType'); // <-- Cambiato da searchType a filmSearchType
            params.minRating = formData.get('minRating');
            params.oscarStatus = formData.get('oscarStatus');
            params.yearFrom = formData.get('yearFrom');
            params.yearTo = formData.get('yearTo');

            const genres = [];
            document.querySelectorAll('input[name="genres"]:checked').forEach(checkbox => {
                genres.push(checkbox.value);
            });
            if (genres.length > 0) params.genres = genres.join(',');

            console.log('Client - Filtri film:', {
                filmQuery: params.filmQuery,
                searchQuery: params.searchQuery,
                genres: params.genres
            });

        } else if (params.searchType === 'reviews') {
            params.filmQuery = formData.get('reviewFilmQuery');
            params.criticQuery = formData.get('reviewCriticQuery');
            params.minRating = formData.get('reviewMinRating');
            params.topCriticsOnly = formData.get('topCriticsOnly') === 'on';
// Validazione campi obbligatori per le recensioni
            if (!params.filmQuery && !params.criticQuery) {
                const alertHTML = `
        <div class="alert alert-warning alert-dismissible fade show mt-3" role="alert">
            <strong>Attenzione!</strong> Specificare almeno il titolo del film o il nome del critico
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;

                const existingAlert = document.querySelector('#advancedSearchForm .alert');
                if (existingAlert) existingAlert.remove();

                const submitButton = searchForm.querySelector('button[type="submit"]');
                submitButton.insertAdjacentHTML('afterend', alertHTML);
                return;
            }
            console.log('Client - Filtri recensioni:', {
                filmQuery: params.filmQuery,
                criticQuery: params.criticQuery
            });
        }

        // Converti i parametri in una stringa query serializzata
        const queryString = new URLSearchParams(params).toString();
        if (searchType === 'films') {
            // Usa lo stesso meccanismo della ricerca full
            AppState.navigateTo('searchResults', {
                query: `advanced:${queryString}`,
                page: 0
            });
        } else {
            AppState.navigateTo('reviewsResults', {
                query: `advanced:${queryString}`,
                page: 0
            });
        }
    };

    // Gestione eventi
    searchTypeSelect.addEventListener('change', (e) => {
        updateFilters(e.target.value);
    });

    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!this.searchExecuted) {
            this.searchExecuted = true;
            executeAdvancedSearch(e).finally(() => {
                this.searchExecuted = false;
            });
        }
    });

    // Inizializzazione
    updateFilters(searchTypeSelect.value);
}
// =============================================
// GESTIONE REVIEWS ADVANCED SEARCH
// =============================================
async function updateReviewResults(query, page) {
    const container = document.getElementById('reviewResultsSection');
    if (!container) return;

    try {
        container.classList.remove('d-none');
        container.innerHTML = `<div class="spinner-border text-primary"></div>`;

        const params = new URLSearchParams(query.replace('advanced:', ''));
        params.set('page', page);

        // Chiamata identica a quella dei film
        const response = await axios.get(`/search/advanced?${params.toString()}`);

        container.innerHTML = response.data;
        updatePaginationState(page, response.data.totalPages);

    } catch (error) {
        container.innerHTML = `
            <div class="alert alert-danger">
                ${error.response?.data || error.message}
                <button onclick="updateReviewResults('${query}', ${page})" 
                        class="btn btn-sm btn-outline-danger ms-2">
                    Riprova
                </button>
            </div>
        `;
    }
}

// Funzione helper per la paginazione
function updatePaginationState(page, totalPages) {
    document.querySelectorAll('.page-item').forEach(item => {
        item.classList.remove('active', 'disabled');
        const itemPage = parseInt(item.querySelector('a')?.dataset.page);

        if (itemPage === page) item.classList.add('active');
        if (item.querySelector('a')?.ariaLabel === 'Previous' && page === 0) {
            item.classList.add('disabled');
        }
        if (item.querySelector('a')?.ariaLabel === 'Next' && page === (totalPages - 1)) {
            item.classList.add('disabled');
        }
    });
}

// Gestione della paginazione con event delegation
function setupReviewPaginationHandlers() {
    document.addEventListener('click', function (e) {
        const link = e.target.closest('.review-pagination-link');
        if (!link) return;

        e.preventDefault();
        const page = parseInt(link.dataset.page);
        const query = link.dataset.query;

        // Gestione URL come nella paginazione dei film
        AppState.navigateTo('reviewsResults', {
            query: query,
            page: page
        });
    });
}

// =============================================
// GESTIONE FILM PER GENERE E OSCAR
// =============================================
const OSCAR_FILMS_CONFIG = {
    apiUrl: "http://localhost:3003/api/by-genre",
    defaultGenre: "Horror",
    limit: 12
};

async function loadAndDisplayOscarFilms(genre = OSCAR_FILMS_CONFIG.defaultGenre) {
    try {
        // Mostra lo stato di caricamento
        document.getElementById('oscarFilmsGrid').innerHTML = `
      <div class="col-12 text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;

        // Carica i film dal backend usando Axios
        const films = await fetchOscarFilms(genre);

        // Popola la griglia
        renderOscarFilms(films);

        // Aggiungi gli event handlers
        setupOscarFilmClickHandlers();

    } catch (error) {
        console.error("Errore nel caricamento film Oscar:", error);
        showOscarError();
    }
}

/**
 * Fetch dei film con Oscar dal backend usando Axios
 */
async function fetchOscarFilms(genre) {
    try {
        const response = await axios.get(`${OSCAR_FILMS_CONFIG.apiUrl}`, {
            params: {
                genre: genre,
                limit: OSCAR_FILMS_CONFIG.limit
            },
            timeout: 15000 // Timeout di 10 secondi
        });

        return response.data;
    } catch (error) {
        console.error("Errore nella chiamata API Oscar:", {
            url: error.config?.url,
            params: error.config?.params,
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
}

/**
 * Renderizza i film nella griglia
 */
function renderOscarFilms(films) {
    const grid = document.getElementById('oscarFilmsGrid');
    if (!films || films.length === 0) {
        document.getElementById('noResults').classList.remove('d-none');
        grid.innerHTML = '';
        return;
    }

    document.getElementById('noResults').classList.add('d-none');

    grid.innerHTML = films.map(film => `
    <div class="col" data-film-id="${film.id}">
      <div class="card h-100 shadow-sm film-card">
        <div class="poster-container" style="background-color: #f5f5f5; height: 450px; display: flex; align-items: center; justify-content: center;">
          ${film.posterUrl ?
        `<img src="${film.posterUrl}" class="card-img-top" alt="${film.title}" 
                  onerror="this.parentElement.innerHTML = '<div class=\'no-poster\' style=\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;\'>Nessun poster</div>'">` :
        `<div class="no-poster" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;">Nessun poster</div>`
    }
        </div>
        <div class="card-body">
          <h5 class="card-title fs-6">${film.title}</h5>
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <small class="text-muted">${film.year}</small>
            </div>
            <div class="text-end">
              <div>
                <small class="text-muted">Rating: ${film.rating !== null ? film.rating.toFixed(1) + ' ★' : 'N/D'}</small>
              </div>
              <div class="mt-1">
                <small class="me-2">
                  <span class="badge bg-warning text-dark">
                    <i class="bi bi-trophy-fill"></i> ${film.oscarWins || 0} vittorie
                  </span>
                </small>
                <small>
                  <span class="badge bg-secondary text-white">
                    <i class="bi bi-star-fill"></i> ${film.oscarNominations || 0} nomination
                  </span>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `).join('');
}

/**
 * Mostra errore nella sezione Oscar
 */
function showOscarError() {
    document.getElementById('oscarFilmsGrid').innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Errore nel caricamento dei dati
        <button onclick="loadAndDisplayOscarFilms()" class="btn btn-sm btn-outline-danger ms-2">
          Riprova
        </button>
      </div>
    </div>
  `;
}

/**
 * Configura gli handler per il click sui film
 */
function setupOscarFilmClickHandlers() {
    const grid = document.getElementById('oscarFilmsGrid');
    if (!grid) return;

    // Controlla se esiste già un handler e lo rimuove
    if (grid._filmClickHandler) {
        grid.removeEventListener('click', grid._filmClickHandler);
    }

    // Definisci il nuovo handler
    grid._filmClickHandler = async (e) => {
        const filmCard = e.target.closest('[data-film-id]');
        if (!filmCard?.dataset?.filmId) return;

        e.preventDefault();
        e.stopPropagation();

        const filmId = filmCard.dataset.filmId;
        if (!filmId) {
            console.error('Invalid Film ID');
            return;
        }

        // Debounce check
        const now = Date.now();
        if (AppState._lastFilmNavigation?.filmId === filmId &&
            now - AppState._lastFilmNavigation?.timestamp < 500) {
            return;
        }

        AppState._lastFilmNavigation = {
            filmId: filmId,
            timestamp: now
        };

        try {
            await AppState.navigateTo('filmDetails', {filmId});
        } catch (error) {
            console.error('Navigation failed:', error);
        }
    };

    // Aggiungi il nuovo listener
    grid.addEventListener('click', grid._filmClickHandler);
}

/**
 * Inizializza il dropdown dei generi
 */
function initOscarGenreDropdown() {
    const dropdownMenu = document.querySelector('#genreDropdown + .dropdown-menu');
    if (!dropdownMenu) return;

    dropdownMenu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.dataset.genre !== 'all') {
            e.preventDefault();

            // Aggiorna lo stato attivo nel dropdown
            dropdownMenu.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');

            // Aggiorna il testo del pulsante
            document.getElementById('genreDropdown').innerHTML = `
        <i class="bi bi-filter"></i> ${e.target.textContent}
      `;

            // Carica i film per il nuovo genere
            loadAndDisplayOscarFilms(e.target.dataset.genre);
        }
    });
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
        if (this.currentView === view &&
            JSON.stringify(params) === JSON.stringify(this.currentParams)) {
            return;
        }
        this.previousView = this.currentView;
        this.currentView = view;
        this.currentParams = params;

        switch (view) {
            case 'carousel':
                this.showCarousel(replace);
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
            case 'advancedSearch': // Aggiungi questo caso
                this.showAdvancedSearch();
                break;
            case 'reviewsResults':
                this.searchQuery = params.query;
                this.currentPage = params.page || 0;
                this.showReviewResults(params.query, params.page);
                break;
        }

        this.updateHistory(view, params, replace);
    },

    showReviewResults: function (query, page = 0) {
        // Nascondi tutte le altre sezioni
        document.getElementById('carouselSection').classList.add('d-none');
        document.getElementById('filmDetailSection').style.display = 'none';
        document.getElementById('searchResultsSection').classList.add('d-none');
        document.getElementById('chatSection').classList.add('d-none');
        document.getElementById('advancedSearchSection').classList.add('d-none');
        // Mostra la sezione recensioni
        document.getElementById('reviewResultsSection').classList.remove('d-none');
        // Carica i risultati
        updateReviewResults(query, page);
    },


    showAdvancedSearch: async function () {
        // Nascondi tutte le altre sezioni
        document.getElementById('reviewResultsSection').classList.remove('d-block');
        document.getElementById('carouselSection').classList.add('d-none');
        document.getElementById('filmDetailSection').style.display = 'none';
        document.getElementById('searchResultsSection').classList.add('d-none');
        document.getElementById('chatSection').classList.add('d-none');
        document.getElementById('reviewResultsSection').classList.add('d-none');
        // Mostra la sezione di ricerca avanzata
        document.getElementById('advancedSearchSection').classList.remove('d-none');
    },

    showChat: async function () {
        // Nascondi tutte le altre view prima
        document.getElementById('carouselSection').classList.add('d-none');
        document.getElementById('filmDetailSection').style.display = 'none';
        document.getElementById('searchResultsSection').classList.add('d-none');
        document.getElementById('advancedSearchSection').classList.add('d-none');
        document.getElementById('reviewResultsSection').classList.add('d-none');
        // Mostra la chat
        document.getElementById('chatSection').classList.remove('d-none');

        if (!this.chatInitialized) {
            await initChatSystem();
            this.chatInitialized = true;
        }
    },

    showCarousel: async function (replace) {
        if(replace){
            initOscarGenreDropdown();
            loadAndDisplayOscarFilms();
        }else{
        const carouselSection = document.getElementById('carouselSection');
        const previousContent = carouselSection.innerHTML;
        const tabId = sessionStorage.getItem('tabId'); // Recupera il tabId dallo storage
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
        document.getElementById('advancedSearchSection').classList.add('d-none');
        document.getElementById('reviewResultsSection').classList.add('d-none');
        try {
            // Ricarica i film solo se necessario
            if (document.querySelectorAll('.film-poster-container').length === 0) {
                console.log("sto per ricaricare il carosello")
                const response = await axios.get('/', {
                    params: {
                        tabId: tabId,  // <-- Passa il tabId alla route /
                        t: Date.now()  // Evita cache
                    }
                });
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.data, 'text/html');
                const newCarousel = doc.getElementById('carouselSection');
                if (newCarousel) {
                    carouselSection.innerHTML = newCarousel.innerHTML;
                    setupFilmCardClickHandlers();
                    // Inizializza la sezione Oscar
                    initOscarGenreDropdown();
                    loadAndDisplayOscarFilms();
                }else {
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
        }
    },

    showFilmDetails: async function (filmId) {
        document.getElementById('carouselSection').classList.add('d-none');
        document.getElementById('searchResultsSection').classList.add('d-none');
        document.getElementById('filmDetailSection').style.display = 'block';
        document.getElementById('chatSection').classList.add('d-none');
        document.getElementById('advancedSearchSection').classList.add('d-none');
        document.getElementById('reviewResultsSection').classList.add('d-none');
        await showFilmDetails(filmId);
    },

    showSearchResults: function (query, page = 0) {
        document.getElementById('carouselSection').classList.add('d-none');
        document.getElementById('filmDetailSection').style.display = 'none';
        document.getElementById('searchResultsSection').classList.remove('d-none');
        document.getElementById('chatSection').classList.add('d-none');
        document.getElementById('advancedSearchSection').classList.add('d-none');
        document.getElementById('reviewResultsSection').classList.add('d-none');
        updateSearchResults(query, page);
    },


    updateHistory: function (view, params, replace = false) {
        // Validazione minima
        if (view === 'searchResults') {
            if (!params || !params.query) {
                console.error('Search navigation requires query parameter');
                // Fallback alla home se la query manca
                this.navigateTo('carousel', {}, true);
                return;
            }
        }
        if (view === 'filmDetails' && !params.filmId) {
            console.error('Film details navigation requires filmId');
            return;
        }
        if (view === 'reviewsResults' && !params.query) {
            console.error('Review search navigation requires query');
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
                if (params.query.startsWith('advanced:')) {
                    const queryParams = new URLSearchParams(params.query.replace('advanced:', ''));
                    queryParams.set('page', params.page || 0);
                    queryParams.set('searchType', 'films'); // Aggiungi esplicitamente
                    url = `/search/advanced?${queryParams.toString()}`;
                } else {
                    url = `/films/search/full?q=${encodeURIComponent(params.query)}&page=${params.page || 0}`;
                }
                state = {
                    view: 'searchResults',
                    query: params.query,
                    page: params.page || 0
                };
                break;
            case 'reviewsResults':
                // Per le ricerche avanzate di recensioni
                const queryParams = new URLSearchParams(params.query.replace('advanced:', ''));
                queryParams.set('page', params.page || 0);
                url = `/search/advanced?${queryParams.toString()}`;
                state = {
                    view: 'reviewsResults',
                    query: params.query,
                    page: params.page || 0,
                    previousState: this.currentView === 'advancedSearch' ? {
                        view: 'advancedSearch'
                    } : null
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
            case 'advancedSearch':
                url = '/advanced-search';
                state = {
                    view: 'advancedSearch',
                    previousState: this.currentView === 'searchResults' ? {
                        view: 'searchResults',
                        query: this.searchQuery,
                        page: this.currentPage
                    } : null
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

    handlePopState: function (event) {
        if (this._isHandlingPopstate) return;
        this._isHandlingPopstate = true;

        try {
            const url = new URL(window.location.href);
            // Debug: log dello stato corrente
            console.log('Popstate triggered:', {
                path: url.pathname,
                searchParams: Object.fromEntries(url.searchParams.entries()),
                eventState: event.state
            });

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
                    switch (prev.view) {
                        case 'carousel':
                            this._navigateToCarousel();
                            break;
                        case 'searchResults':
                            this._navigateToSearchResults(prev.query, prev.page);
                            break;
                        case 'filmDetails':
                            this._navigateToFilmDetails(prev.filmId);
                            break;
                        case 'reviewResults':
                            this._navigateToReviewsResults(prev.query, prev.page);
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
                switch (event.state.view) {
                    case 'carousel':
                        this._navigateToCarousel();
                        break;
                    case 'filmDetails':
                        this._navigateToFilmDetails(event.state.filmId, true);
                        break;
                    case 'searchResults':
                        this._navigateToSearchResults(event.state.query, event.state.page, false);
                        break;
                    case 'chat':
                        this._navigateToChat();
                        break;
                    case 'advancedSearch':
                        this._navigateToAdvancedSearch();
                        break;
                    case 'reviewsResults':  // Aggiungi questo caso
                        this._navigateToReviewsResults(event.state.query, event.state.page, true);
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
                } else if (url.pathname === '/advanced-search') {
                    this._navigateToAdvancedSearch();
                } else if (url.pathname.startsWith('/search/advanced')) {
                    const searchType = url.searchParams.get('searchType');
                    const queryParams = new URLSearchParams(url.searchParams);

                    // Ricostruisci la query nel formato 'advanced:params'
                    queryParams.delete('page'); // Il page va separato
                    const query = 'advanced:' + queryParams.toString();
                    const page = parseInt(url.searchParams.get('page')) || 0;

                    if (searchType === 'reviews') {
                        this._navigateToReviewsResults(query, page);
                    } else {
                        // Default a 'films' se searchType mancante ma ci sono parametri film
                        if (!searchType && (url.searchParams.has('filmQuery') || url.searchParams.has('filmSearchType'))) {
                            queryParams.set('searchType', 'films');
                        }
                        this._navigateToSearchResults(query, page);
                    }
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

    _navigateToReviewsResults: function (query, page, forceReload = false) {
        // Correggi il nome della view e aggiungi forceReload
        if (!forceReload &&
            this.currentView === 'reviewsResults' &&  // Modificato da reviewResults
            this.searchQuery === query &&
            this.currentPage === page) {
            return;
        }

        this.currentView = 'reviewsResults';  // Modificato da reviewSearch
        this.searchQuery = query;
        this.currentPage = page;
        this.showReviewResults(query, page);
    },

    _navigateToAdvancedSearch: function () {
        if (this.currentView === 'advancedSearch') return;

        this.currentView = 'advancedSearch';
        this.showAdvancedSearch();
    },

    //helper per la navigazione alla chat
    _navigateToChat: function () {
        if (this.currentView === 'chat') return;

        this.currentView = 'chat';
        this.showChat();
    },

// Aggiungi queste funzioni helper a AppState:
    _navigateToFilmDetails: function (filmId) {
        if (this.currentView === 'filmDetails' && this.currentFilmId === filmId) {
            return;
        }

        this.currentView = 'filmDetails';
        this.currentFilmId = filmId;
        this.showFilmDetails(filmId);
    },

    _navigateToSearchResults: function (query, page, forceReload = false) {
        if (!forceReload &&
            this.currentView === 'searchResults' &&
            this.searchQuery === query &&
            this.currentPage === page) {
            return;
        }

        this.currentView = 'searchResults';
        this.searchQuery = query;
        this.currentPage = page;
        this.showSearchResults(query, page);
    },

    _navigateToCarousel: function () {
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
        // 1. INIZIALIZZAZIONE TAB ID
        if (!sessionStorage.getItem('tabId')) {
            const newTabId = crypto.randomUUID();
            sessionStorage.setItem('tabId', newTabId);
            console.log('Generato nuovo tabId:', newTabId); // Debug
            AppState.navigateTo('carousel');
        }
        hideAllSections();
        document.getElementById('loaderSection').classList.remove('hidden-section');

        // Setup eventi
        setupNavbarEvents();
        setupSearch();
        setupFilmCardClickHandlers();
        setupPaginationHandlers();
        setupAdvancedSearchButtons();
        setupReviewPaginationHandlers();

        const isAuthenticated = await checkAuthState();
        if (isAuthenticated) {
            showDashboard();
            // Salva lo stato iniziale nella history
            if (window.location.pathname === '/' && !history.state) {
                history.replaceState({view: 'carousel'}, '', '/');
            }

            // Determina la vista iniziale in base all'URL
            if (window.location.pathname === '/sio/chat') {
                AppState.navigateTo('chat', {}, true); // ora è valido
            } else if (window.location.pathname === '/advanced-search') {
                AppState.navigateTo('advancedSearch', {}, true); // Aggiungi questo caso
            } else if (window.location.pathname.startsWith('/film/')) {
                const filmId = window.location.pathname.split('/')[2];
                AppState.navigateTo('filmDetails', {filmId}, true);
            } else if (window.location.pathname.startsWith('/films/search')) {
                const urlParams = new URLSearchParams(window.location.search);
                const query = urlParams.get('q');

                if (!query) {
                    console.warn('Missing search query, redirecting to home');
                    AppState.navigateTo('carousel', {}, true);
                    return;
                }

                // Solo ricerche full-text, niente gestione "advanced:" qui
                AppState.navigateTo('searchResults', {
                    query: query,
                    page: parseInt(urlParams.get('page')) || 0
                }, true);

            } else if (window.location.pathname.startsWith('/search/advanced')) {
                const urlParams = new URLSearchParams(window.location.search);
                const searchType = urlParams.get('searchType');
                const page = parseInt(urlParams.get('page')) || 0;
                const query = `advanced:${urlParams.toString()}`;

                // Auto-rilevamento se searchType mancante
                const finalSearchType = searchType ||
                    (urlParams.has('filmQuery') ? 'films' : null);

                if (finalSearchType === 'reviews') {
                    AppState.navigateTo('reviewsResults', {query, page}, true);
                } else if (finalSearchType === 'films' || urlParams.has('filmQuery')) {
                    AppState.navigateTo('searchResults', {query, page}, true);
                } else {
                    console.error('Invalid search type, redirecting to home');
                    AppState.navigateTo('carousel', {}, true);
                }
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