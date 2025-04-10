// Configurazione iniziale (in testa al file)
const API_BASE_URL = window.location.origin;
axios.defaults.withCredentials = true; // Abilita i cookie
axios.defaults.baseURL = API_BASE_URL; // Imposta l'URL base

document.addEventListener('DOMContentLoaded', async () => {
    const mainContent = document.getElementById('mainContent');
    const initialLoader = '<div class="text-center mt-5"><div class="spinner-border text-primary"></div><p>Caricamento in corso...</p></div>';

    if (mainContent) mainContent.innerHTML = initialLoader;

    try {
        // 1. Setup event listener PRIMA di qualsiasi operazione
        setupNavbarEvents();

        // 2. Verifica stato autenticazione
        const isAuthenticated = await checkAuthState();

        if (!isAuthenticated) {
            await showAuthForms();
        } else if (mainContent.innerHTML === initialLoader) {
            mainContent.innerHTML = '';
        }
    } catch (error) {
        console.error('Init error:', error);
        showAlert(`Errore iniziale: ${error.message}`, 'danger');
        await showAuthForms();
    }
});


// Nuova versione di setupNavbarEvents con delegation robusta
function setupNavbarEvents() {
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('#loginBtn, #registerBtn, #logoutBtn, #loadDbBtn');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        try {
            switch(target.id) {
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
                    if (target.dataset.role !== 'admin') {
                        showAlert('Accesso negato', 'warning');
                        return;
                    }
                    await handleDbLoad(target);
                    break;
            }
        } catch (error) {
            console.error(`${target.id} error:`, error);
            showAlert(`Errore in ${target.id}`, 'danger');
        }
    });
}
// Handler specifici per migliorare la modularità
async function handleLoginClick() {
    // Mostra solo se necessario (evita ricaricamenti inutili)
    if (document.getElementById('loginFormContainer').classList.contains('d-none')) {
        await showAuthForms();
    }
    toggleForms(true);  // Mostra login, nascondi registrazione
    closeMobileMenu();
}

async function handleRegisterClick() {
    // Mostra solo se necessario (evita ricaricamenti inutili)
    if (document.getElementById('registerFormContainer').classList.contains('d-none')) {
        await showAuthForms();
    }
    toggleForms(false);  // Mostra registrazione, nascondi login
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
    if (button.dataset.role !== 'admin') {
        showAlert('Area riservata agli amministratori', 'warning');
        return;
    }

    const originalText = button.innerHTML;
    button.innerHTML = `
        <span class="spinner-border spinner-border-sm"></span>
        Caricamento in corso...
    `;
    button.disabled = true;

    showAlert('Operazione in corso...', 'info', 10000);

    try {
        const response = await fetch('/admin/upload-db', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.message || 'Errore sconosciuto');

        showAlert(result.message || 'Database caricato!', 'success');
    } catch (error) {
        console.error('DB load error:', error);
        showAlert(error.message || 'Errore durante il caricamento', 'danger');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Funzione per chiudere il menu hamburger
// Versione semplificata di closeMobileMenu che funziona senza type checking
function closeMobileMenu() {
    const navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        // Soluzione alternativa che non richiede bootstrap.Collapse
        navbarCollapse.classList.remove('show');

        // Oppure, se vuoi mantenere l'animazione:
        // navbarCollapse.style.transition = 'height 0.3s ease';
        // navbarCollapse.style.height = '0';
        // setTimeout(() => navbarCollapse.classList.remove('show'), 300);
    }
}

// Versione modificata di checkAuthState (ancora con fetch)
async function checkAuthState() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/check?t=${Date.now()}`, {
            credentials: 'include',
            cache: 'no-store'
        });

        if (!response.ok) return false;

        const data = await response.json();
        if (data.authenticated) {
            updateUIForAuthenticatedUser(data.user);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

function updateUIForAuthenticatedUser(user) {
    // Gestione elementi authSection
    const authSection = document.getElementById('authSection');
    if (authSection) {
        const greeting = authSection.querySelector('#userGreeting');
        const logoutBtn = authSection.querySelector('#logoutBtn');
        const loginBtn = authSection.querySelector('#loginBtn');
        const registerBtn = authSection.querySelector('#registerBtn');

        if (greeting) {
            greeting.textContent = `Ciao, ${user.username}`;
            greeting.classList.remove('d-none');
        }

        if (logoutBtn) logoutBtn.classList.remove('d-none');
        if (loginBtn) loginBtn.classList.add('d-none');
        if (registerBtn) registerBtn.classList.add('d-none');
    }

// Gestione admin button
    const adminBtnContainer = document.getElementById('adminBtnContainer');
    if (adminBtnContainer) {
        adminBtnContainer.classList.toggle('d-none', user.role !== 'admin');
        adminBtnContainer.style.display = user.role === 'admin' ? 'block' : 'none'; // Doppio controllo

        const adminBtn = document.getElementById('loadDbBtn');
        if (adminBtn) {
            adminBtn.dataset.role = user.role;
            // Resetta lo stato del bottone
            adminBtn.disabled = false;
            adminBtn.innerHTML = '<i class="bi bi-database"></i> Carica DB';
        }
    }
}

function loadMainContent(role) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="welcome-message text-center mt-5">
            <h2>Benvenuto nella tua Dashboard</h2>
            <p class="lead">Accesso effettuato con successo</p>
            ${role === 'admin' ? '<p class="text-muted">Sei loggato come amministratore</p>' : ''}
        </div>
    `;
}


async function showAuthForms() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('Elemento mainContent non trovato');
        return;
    }

    // Mostra loader
    mainContent.innerHTML = `
        <div class="text-center mt-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2">Caricamento form...</p>
        </div>
    `;

    try {
        const response = await fetch('/auth/forms', {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            // Invece di throw, gestiamo direttamente l'errore
            const error = new Error(`Errore HTTP: ${response.status}`);
            error.response = response;
            throw error;
        }

        mainContent.innerHTML = await response.text();
        await setupAuthForms();

    } catch (error) {
        console.error('Error loading auth forms:', error);

        const errorMessage = error.response?.status === 500 ?
            'Errore interno del server' :
            'Errore nel caricamento del form';

        mainContent.innerHTML = `
            <div class="alert alert-danger mt-5">
                <h5 class="alert-heading">${errorMessage}</h5>
                <p>Si è verificato un problema tecnico.</p>
                <hr>
                <div class="d-flex justify-content-between">
                    <button onclick="location.reload()" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-arrow-clockwise"></i> Ricarica
                    </button>
                    <button onclick="showAuthForms()" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-arrow-repeat"></i> Riprova
                    </button>
                </div>
            </div>
        `;
    }
}

async function setupAuthForms() {
    // Inizializza i form
    toggleForms(true); // Mostra login, nascondi registrazione

    // Elementi UI
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    // Switch tra form con gestione errori
    if (switchToRegister && switchToLogin) {
        switchToRegister.addEventListener('click', () => {
            try {
                toggleForms(false);
            } catch (error) {
                console.error('Error switching to register form:', error);
            }
        });

        switchToLogin.addEventListener('click', () => {
            try {
                toggleForms(true);
            } catch (error) {
                console.error('Error switching to login form:', error);
            }
        });
    }

    // Gestione Login con validazione migliorata
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = loginForm.username.value.trim();
            const password = loginForm.password.value.trim();

            if (!username || !password) {
                showAlert('Compila tutti i campi', 'warning');
                return;
            }

            try {
                await handleAuthRequest(
                    loginForm,
                    '/auth/login',
                    { username, password },
                    'Accedi',
                    (userData) => {
                        updateUIForAuthenticatedUser(userData);
                        loadMainContent(userData.role);
                    }
                );
            } catch (error) {
                console.error('Login error:', error);
            }
        });
    }

    // Gestione Registrazione con validazione migliorata
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = registerForm.username.value.trim();
            const password = registerForm.password.value.trim();
            const confirmPassword = registerForm.confirmPassword.value.trim();

            // Validazione avanzata
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

            try {
                await handleAuthRequest(
                    registerForm,
                    '/auth/register',
                    { username, password, confirmPassword },
                    'Registrati',
                    () => {
                        showAlert('Registrazione completata! Ora puoi accedere', 'success');
                        registerForm.reset();
                        toggleForms(true);
                    }
                );
            } catch (error) {
                console.error('Registration error:', error);
            }
        });
    }
}

// Funzione per gestire richieste di autenticazione
async function handleAuthRequest(form, endpoint, data, buttonText, onSuccess) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    submitBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status"></span>
        ${buttonText} in corso...
    `;
    submitBtn.disabled = true;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    }).catch(() => null);

    const result = await response?.json().catch(() => null);

    if (response?.ok && result?.success) {
        if (typeof onSuccess === 'function') {
            onSuccess(result.user || result);
        }
    } else {
        showAlert(result?.error || `${buttonText} fallito`, 'danger');
    }

    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
}

async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            console.error('Logout failed with status:', response.status);
            showAlert('Errore durante il logout', 'danger');
            return;
        }

        resetAuthUI(); // Aggiunto questa linea per pulire l'UI
        window.location.href = '/';

    } catch (error) {
        console.error('Errore durante il logout:', error);
        showAlert('Errore di connessione durante il logout', 'danger');
    }
}

// Reset UI dopo logout
function resetAuthUI() {
    const authSection = document.getElementById('authSection');
    if (authSection) {
        const greeting = authSection.querySelector('#userGreeting');
        const logoutBtn = authSection.querySelector('#logoutBtn');
        const loginBtn = authSection.querySelector('#loginBtn');
        const registerBtn = authSection.querySelector('#registerBtn');

        if (greeting) greeting.classList.add('d-none');
        if (logoutBtn) logoutBtn.classList.add('d-none');
        if (loginBtn) loginBtn.classList.remove('d-none');
        if (registerBtn) registerBtn.classList.remove('d-none');
    }
}

// Funzioni di utilità
function toggleForms(showLogin) {
    const loginFormContainer = document.getElementById('loginFormContainer');
    const registerFormContainer = document.getElementById('registerFormContainer');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginFormContainer && registerFormContainer) {
        if (showLogin) {
            loginFormContainer.classList.remove('d-none');
            loginFormContainer.classList.add('d-block');
            registerFormContainer.classList.remove('d-block');
            registerFormContainer.classList.add('d-none');

            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
        } else {
            loginFormContainer.classList.remove('d-block');
            loginFormContainer.classList.add('d-none');
            registerFormContainer.classList.remove('d-none');
            registerFormContainer.classList.add('d-block');

            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'block';
        }

        // Pulisci gli alert
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) existingAlert.remove();
    }
}

function showAlert(message, type = 'info', duration = 5000) {
    // Rimuovi alert esistenti sia globali che locali
    document.querySelectorAll('.global-alert, .alert').forEach(alert => alert.remove());

    // Crea nuovo alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;

    // Aggiungi classe in base alla posizione desiderata
    if (type === 'info' || duration > 7000) {
        // Alert globale/lungo durata (posizione fissa)
        alertDiv.classList.add('global-alert');
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        alertDiv.style.maxWidth = '80vw';
    } else {
        // Alert normale (nel contesto della card)
        alertDiv.classList.add('local-alert');
    }

    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Posizionamento intelligente
    const cardBody = document.querySelector('.card-body');
    if (cardBody && !alertDiv.classList.contains('global-alert')) {
        cardBody.prepend(alertDiv);
    } else {
        // Default: aggiungi in fondo al body
        document.body.appendChild(alertDiv);
    }

    // Auto-dismiss
    if (duration) {
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }, duration);
    }

    return alertDiv; // Restituisce l'elemento per eventuali controlli aggiuntivi
}