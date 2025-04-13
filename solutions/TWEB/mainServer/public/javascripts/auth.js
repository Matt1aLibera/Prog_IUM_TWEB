const API_BASE_URL = window.location.origin;
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        hideAllSections();
        document.getElementById('loaderSection').classList.remove('hidden-section');

        setupNavbarEvents();
        const isAuthenticated = await checkAuthState();

        if (isAuthenticated) {
            showDashboard();
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

// Helper functions
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

// Navbar functions
function setupNavbarEvents() {
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('#loginBtn, #registerBtn, #logoutBtn, #loadDbBtn');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        try {
            switch(target.id) {
                case 'loginBtn': await handleLoginClick(); break;
                case 'registerBtn': await handleRegisterClick(); break;
                case 'logoutBtn': await handleLogoutClick(target); break;
                case 'loadDbBtn': await handleDbLoad(target); break;
            }
        } catch (error) {
            console.error(`${target.id} error:`, error);
            showAlert(`Errore in ${target.id}`, 'danger');
            await checkAuthState();
        }
    });
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
        const { data } = await axios.post('/admin/upload-db', {}, {
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

function closeMobileMenu() {
    const navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse?.classList.contains('show')) {
        navbarCollapse.classList.remove('show');
    }
}

// Auth state management
async function checkAuthState() {
    try {
        const { data } = await axios.get('/auth/check', {
            params: { t: Date.now() },
            headers: { 'Cache-Control': 'no-cache' }
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

// Auth forms management
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
                { username, password },
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
                { username, password, confirmPassword },
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
        const { data: result } = await axios.post(endpoint, data);
        if (result.success) {
            if (endpoint === '/auth/login') {
                // Forza il refresh della pagina per vedere i nuovi film
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
