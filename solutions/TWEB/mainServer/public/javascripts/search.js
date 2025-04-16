document.addEventListener('DOMContentLoaded', function() {
    // Configurazione Axios
    const API_BASE_URL = window.location.origin;
    const axiosInstance = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    });

    // Elementi DOM
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchTypeDropdown = document.getElementById('searchTypeDropdown');
    const searchOptions = document.querySelectorAll('.search-option');
    let currentSearchType = 'film';
    let autocompleteTimeout;

    // Gestione tipo di ricerca
    searchOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            currentSearchType = this.dataset.type;
            searchTypeDropdown.textContent = this.textContent;
        });
    });

    // Gestione input con debounce
    searchInput.addEventListener('input', function() {
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

    // Gestione pulsante ricerca
    searchButton.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            window.location.href = `/search/films?q=${encodeURIComponent(query)}`;
        }
    });

    // Gestione Invio
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchButton.click();
    });

    // Chiudi dropdown al click esterno
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.input-group')) {
            hideAutocompleteDropdown();
        }
    });

    // Funzione per fetch risultati
    async function fetchAutocompleteResults(query) {
        // Prima cancella eventuali dropdown esistenti
        hideAutocompleteDropdown();

        // Crea e mostra l'indicatore di caricamento
        const loadingDropdown = document.createElement('div');
        loadingDropdown.id = 'autocompleteLoading';
        loadingDropdown.className = 'autocomplete-dropdown';
        loadingDropdown.innerHTML = '<div class="autocomplete-loading">Caricamento suggerimenti</div>';
        document.querySelector('.input-group').appendChild(loadingDropdown);

        try {
            const response = await axios.get('/films/search/autocomplete', {
                params: { q: query },
                timeout: 13000
            });

            // Rimuovi l'indicatore di caricamento
            hideAutocompleteDropdown();

            // Mostra i risultati solo se la query è ancora rilevante
            if (searchInput.value.trim() === query) {
                showAutocompleteDropdown(response.data || []);
            }

        } catch (error) {
            console.error('Autocomplete error:', error.message);
            hideAutocompleteDropdown();

            // Mostra messaggio di errore
            const errorDropdown = document.createElement('div');
            errorDropdown.id = 'autocompleteDropdown';
            errorDropdown.className = 'autocomplete-dropdown';
            errorDropdown.innerHTML = '<div class="autocomplete-loading">Errore nel caricamento</div>';
            document.querySelector('.input-group').appendChild(errorDropdown);
        }
    }

    // Mostra dropdown risultati
    function showAutocompleteDropdown(results) {
        const existingDropdown = document.getElementById('autocompleteDropdown');
        const dropdown = existingDropdown || document.createElement('div');
        dropdown.id = 'autocompleteDropdown';
        dropdown.className = 'autocomplete-dropdown';

        if (!results || results.length === 0) {
            dropdown.innerHTML = '<div class="autocomplete-loading">Nessun risultato trovato</div>';
        } else {
            dropdown.innerHTML = ''; // Pulisci il contenuto
            results.slice(0, 5).forEach(film => {
                const item = document.createElement('a');
                item.className = 'autocomplete-item';
                item.href = '#';
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
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    searchInput.value = film.name;
                    hideAutocompleteDropdown();
                });
                dropdown.appendChild(item);
            });
        }

        if (!existingDropdown) {
            document.querySelector('.input-group').appendChild(dropdown);
        }
    }

    // Nascondi dropdown
    function hideAutocompleteDropdown() {
        const dropdown = document.getElementById('autocompleteDropdown');
        const loading = document.getElementById('autocompleteLoading');

        if (dropdown) dropdown.remove();
        if (loading) loading.remove();
    }
});