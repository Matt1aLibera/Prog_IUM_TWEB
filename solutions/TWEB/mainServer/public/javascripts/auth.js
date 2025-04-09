document.addEventListener('DOMContentLoaded', async () => {
    // Mostra subito un loader per migliorare l'esperienza utente
    const mainContent = document.getElementById('mainContent');
    const initialLoader = '<div class="text-center mt-5"><div class="spinner-border text-primary"></div><p class="mt-2">Caricamento in corso...</p></div>';

    if (mainContent) {
        mainContent.innerHTML = initialLoader;
    }

    try {
        // 1. Verifica lo stato di autenticazione
        const isAuthenticated = await checkAuthState();

        // 2. Se non autenticato, mostra i form di login
        if (!isAuthenticated) {
            await showAuthForms();
        }

        // 3. Configura gli eventi della navbar in ogni caso
        await setupNavbarEvents();

    } catch (error) {
        console.error('Initialization error:', error);

        // Mostra un messaggio di errore più descrittivo
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger mt-5">
                    <h4 class="alert-heading">Errore di inizializzazione</h4>
                    <p>Si è verificato un errore durante il caricamento dell'applicazione.</p>
                    <hr>
                    <p class="mb-0">${error.message || 'Errore sconosciuto'}</p>
                    <button onclick="window.location.reload()" class="btn btn-sm btn-outline-danger mt-2">
                        Ricarica la pagina
                    </button>
                </div>
            `;
        }

        // Fallback: prova comunque a mostrare i form di login
        try {
            await showAuthForms();
        } catch (secondaryError) {
            console.error('Failed to show auth forms:', secondaryError);
        }
    } finally {
        // Rimuovi il loader se è ancora presente (non sovrascritto da altre funzioni)
        if (mainContent && mainContent.innerHTML === initialLoader) {
            mainContent.innerHTML = '';
        }
    }
});

async function setupNavbarEvents() {
    document.addEventListener('click', async (e) => {
        // Gestione Logout
        if (e.target.id === 'logoutBtn') {
            try {
                await logout();
            } catch (error) {
                showAlert('Errore durante il logout', 'danger');
            }
            return;
        }


        // Gestione Login
        if (e.target.id === 'loginBtn') {
            try {
                toggleForms(true);
                closeMobileMenu();
            } catch (error) {
                console.error('Errore durante il login:', error);
                showAlert('Errore durante il login', 'danger');
            }
            return;
        }

        // Gestione Registrati
        if (e.target.id === 'registerBtn') {
            try {
                toggleForms(false);
                closeMobileMenu();
            } catch (error) {
                console.error('Errore durante la registrazione:', error);
                showAlert('Errore durante la registrazione', 'danger');
            }
        }

        // Gestione Caricamento Database
        if (e.target.id === 'loadDbBtn') {
            if (e.target.dataset.role !== 'admin') {
                showAlert('Area riservata agli amministratori', 'warning');
                return;
            }

            // Mostra spinner e messaggio
            const originalText = e.target.innerHTML;
            e.target.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status"></span>
                Caricamento in corso...
            `;
            e.target.disabled = true;

            showAlert('Questa operazione potrebbe richiedere alcuni minuti', 'info', 10000);

            try {
                const response = await fetch('/admin/upload-db', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });

                const result = await response.json();

                if (result.success) {
                    showAlert(result.message, 'success');
                } else {
                    showAlert(result.message || 'Caricamento fallito', 'danger');
                }

            } catch (error) {
                console.error('Errore:', error);
                showAlert('Errore di connessione durante il caricamento', 'danger');
            } finally {
                // Ripristina il bottone
                e.target.innerHTML = originalText;
                e.target.disabled = false;
            }
        }
    });
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

async function checkAuthState() {
    const response = await fetch(`/auth/check?t=${new Date().getTime()}`, {
        credentials: 'include',
        cache: 'no-store'
    }).catch(() => null);

    if (!response || !response.ok) {
        await showAuthForms();
        return false;
    }

    const data = await response.json().catch(() => null);
    if (!data) {
        await showAuthForms();
        return false;
    }

    if (data.authenticated) {
        updateUIForAuthenticatedUser(data.user);
        loadMainContent(data.user.role);
        return true;
    }

    await showAuthForms();
    document.getElementById('authSection')?.remove();
    return false;
}

function updateUIForAuthenticatedUser(user) {
    // Aggiorna la navbar
    const authSection = document.getElementById('authSection');
    if (authSection) {
        authSection.innerHTML = `
            <div class="navbar-text me-3">Ciao, ${user.username}</div>
            <button class="btn btn-outline-light" id="logoutBtn">Logout</button>
        `;
    }

    // Gestione pulsante admin
    const navbarNav = document.querySelector('.navbar-nav');
    if (navbarNav) {
        let adminBtnContainer = document.getElementById('loadDbBtnContainer');

        if (!adminBtnContainer) {
            adminBtnContainer = document.createElement('li');
            adminBtnContainer.id = 'loadDbBtnContainer';
            adminBtnContainer.className = 'nav-item';

            const adminBtn = document.createElement('button');
            adminBtn.id = 'loadDbBtn';
            adminBtn.className = 'btn btn-outline-success';
            adminBtn.dataset.role = 'admin';
            adminBtn.innerHTML = '<i class="bi bi-database"></i> Carica DB';

            adminBtnContainer.appendChild(adminBtn);
            navbarNav.appendChild(adminBtnContainer);
        }

        // Aggiorna visibilità
        adminBtnContainer.style.display = user.role === 'admin' ? 'block' : 'none';

        // Aggiorna lo stato del dataset per coerenza
        document.getElementById('loadDbBtn').dataset.role = user.role;
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



async function uploadDatabase() {
    try {
        const response = await fetch('/admin/upload-db', {
            method: 'POST'
        });
        const result = await response.json();
        showAlert(result.message, result.success ? 'success' : 'danger');
    } catch (error) {
        showAlert('Errore durante il caricamento del database', 'danger');
    }
}

function showAuthForms() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('Elemento mainContent non trovato');
        return;
    }

    // Mostra subito un loader durante il caricamento
    mainContent.innerHTML = `
        <div class="text-center mt-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2">Caricamento form di login...</p>
        </div>
    `;

    fetch('/auth/forms', {
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    })
        .then(response => {
            if (!response.ok) {
                // Se la risposta non è ok, crea un oggetto errore
                const error = new Error(`Errore HTTP: ${response.status}`);
                error.response = response;
                return Promise.reject(error);
            }
            return response.text();
        })
        .then(html => {
            mainContent.innerHTML = html;
            return setupAuthForms(); // Chiamata diretta senza then (non è async)
        })
        .catch(error => {
            console.error('Error loading auth forms:', error);

            // Messaggio diverso per errore 500 vs altri errori
            const errorMessage = error.response?.status === 500
                ? 'Errore interno del server'
                : 'Errore nel caricamento del form';

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
        });
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
            // Invece di throw, gestiamo l'errore direttamente
            console.error('Logout failed with status:', response.status);
            showAlert('Errore durante il logout', 'danger');
            return;
        }

        // Forza il reload per pulire completamente lo stato
        window.location.href = '/';

    } catch (error) {
        console.error('Errore durante il logout:', error);
        showAlert('Errore di connessione durante il logout', 'danger');
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