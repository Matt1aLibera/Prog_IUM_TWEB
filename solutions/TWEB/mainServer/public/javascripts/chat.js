// Inizializzazione della chat
document.addEventListener('DOMContentLoaded', () => {
    // Recupera i dati dalla pagina
    const chatData = {
        user: JSON.parse(document.getElementById('chatData').dataset.user),
        rooms: JSON.parse(document.getElementById('chatData').dataset.rooms),
        currentRoom: JSON.parse(document.getElementById('chatData').dataset.currentRoom)
    };

    // Elementi UI
    const ui = {
        backBtn: document.getElementById('backToMainBtn'),
        roomsList: document.getElementById('roomsList'),
        createRoomBtn: document.getElementById('createRoomBtn'),
        currentRoomTitle: document.getElementById('currentRoomTitle'),
        messagesContainer: document.getElementById('messagesContainer'),
        messageInput: document.getElementById('messageInput'),
        sendMessageBtn: document.getElementById('sendMessageBtn'),
        messageInputContainer: document.getElementById('messageInputContainer'),
        roomTypeSelect: document.getElementById('roomType'),
        dynamicFieldsContainer: document.getElementById('dynamicFieldsContainer'),
        roomCustomName: document.getElementById('roomCustomName'),
        confirmCreateRoom: document.getElementById('confirmCreateRoom'),
        createRoomModal: new bootstrap.Modal('#createRoomModal')
    };

    // Socket.IO connection
    const socket = io('/chat', {
        auth: {
            token: localStorage.getItem('authToken')
        }
    });

    // Inizializza la chat
    initChatSystem();

    function initChatSystem() {
        // 1. Gestione pulsante indietro
        ui.backBtn.addEventListener('click', () => {
            window.location.href = '/';
        });

        // 2. Se c'è una stanza attiva, scrolla in fondo
        if (chatData.currentRoom) {
            scrollMessagesToBottom();
            setupMessageSending();
        }

        // 3. Setup event listeners
        setupRoomSelection();
        setupRoomCreation();
    }

    function scrollMessagesToBottom() {
        ui.messagesContainer.scrollTop = ui.messagesContainer.scrollHeight;
    }

    function setupRoomSelection() {
        // Delegazione eventi per le stanze
        ui.roomsList.addEventListener('click', (e) => {
            const roomItem = e.target.closest('.room-item');
            if (!roomItem) return;

            const roomId = roomItem.dataset.roomId;
            const roomType = roomItem.dataset.roomType;

            // Emetti evento al server per unione stanza
            socket.emit('room:join', { roomId, roomType });
        });
    }

    function setupMessageSending() {
        ui.sendMessageBtn.addEventListener('click', sendMessage);
        ui.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        function sendMessage() {
            const message = ui.messageInput.value.trim();
            if (message && chatData.currentRoom) {
                socket.emit('message:send', {
                    roomId: chatData.currentRoom.id,
                    text: message
                });
                ui.messageInput.value = '';
            }
        }
    }

    function setupRoomCreation() {
        ui.createRoomBtn.addEventListener('click', () => {
            ui.createRoomModal.show();
        });

        // Cambio tipo stanza
        ui.roomTypeSelect.addEventListener('change', updateDynamicFields);

        // Conferma creazione
        ui.confirmCreateRoom.addEventListener('click', createNewRoom);

        function updateDynamicFields() {
            const type = ui.roomTypeSelect.value;
            let html = '';

            switch(type) {
                case 'film':
                    html = `<div class="mb-3">
                        <label class="form-label">Seleziona film:</label>
                        <select class="form-select" id="filmSelect">
                            <!-- Popolato dinamicamente -->
                        </select>
                    </div>`;
                    break;
                // Altri casi...
            }

            ui.dynamicFieldsContainer.innerHTML = html;
        }

        function createNewRoom() {
            const type = ui.roomTypeSelect.value;
            const customName = ui.roomCustomName.value.trim();

            // Logica per creare la stanza
            socket.emit('room:create', { type, customName });
            ui.createRoomModal.hide();
        }
    }

    // Helper per le icone
    function roomIcon(type) {
        const icons = {
            film: 'film',
            actor: 'person',
            crew: 'person-gear',
            character: 'mask'
        };
        return icons[type] || 'chat';
    }

    // Socket.IO event handlers
    socket.on('message:new', (message) => {
        appendMessage(message);
        scrollMessagesToBottom();
    });

    socket.on('room:update', (rooms) => {
        updateRoomsList(rooms);
    });

    function appendMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.userId === chatData.user.id ? 'message-current' : ''}`;
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-user">${message.userName}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-body">${message.text}</div>
        `;
        ui.messagesContainer.appendChild(messageEl);
    }

    function updateRoomsList(rooms) {
        ui.roomsList.innerHTML = rooms.map(room => `
            <a href="#" class="list-group-item list-group-item-action room-item ${room.id === chatData.currentRoom?.id ? 'active' : ''}" 
               data-room-id="${room.id}" data-room-type="${room.type}">
                <div class="d-flex justify-content-between align-items-center">
                    <span>
                        <i class="bi bi-${roomIcon(room.type)} me-2"></i>
                        ${room.name}
                    </span>
                    <span class="badge bg-primary rounded-pill">${room.userCount}</span>
                </div>
            </a>
        `).join('');
    }

    socket.on('reconnect_attempt', () => {
        console.log('Tentativo di riconnessione...');
    });

    socket.on('reconnect_failed', () => {
        showAlert('Connessione persa. Ricarica la pagina.', 'danger');
    });
});