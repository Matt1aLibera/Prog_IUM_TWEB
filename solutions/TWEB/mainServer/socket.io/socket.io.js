const activeRooms = new Map();
const axios = require('axios');

module.exports = {
    init: function(io) {
        const chatNamespace = io.of('/chat');

        chatNamespace.use((socket, next) => {
            // Middleware di autenticazione
            const { userId, username } = socket.handshake.auth;
            if (userId && username) {
                socket.user = { id: userId, username };
                return next();
            }
            next(new Error('Authentication error'));
        });

        chatNamespace.on('connection', (socket) => {
            console.log(`Utente connesso: ${socket.user.username} (${socket.id})`);

            // Creazione o connessione a stanza
            socket.on('chat:join_or_create', (data, callback) => { // Ora riceve 'data' invece di solo roomCode
                if (!socket.user) {
                    return callback({ success: false, error: 'Not authenticated' });
                }

                const { code, name, topic } = data; // Estrai i parametri
                let room = activeRooms.get(code);
                const isNewRoom = !room;

                if (isNewRoom) {
                    room = {
                        id: code,
                        name: name || `Stanza ${code}`, // Usa il nome fornito o un default
                        topic: topic || 'generale',     // Aggiungi il topic
                        users: new Set(),
                        createdAt: new Date()
                    };
                    activeRooms.set(code, room);
                    chatNamespace.emit('chat:room_created', {
                        id: code,
                        name: room.name,
                        topic: room.topic
                    });
                }

                room.users.add(socket.user.id);
                socket.join(code);

                callback({
                    success: true,
                    isNewRoom,
                    roomData: {
                        id: code,
                        name: room.name, // Assicurati che sia una stringa
                        topic: room.topic,
                        users: Array.from(room.users).length
                    }
                });

                if (!isNewRoom) {
                    socket.to(code).emit('chat:user_joined', {
                        userId: socket.user.id,
                        username: socket.user.username
                    });
                }
            });

            // Invio messaggi
            socket.on('chat:message', (data, callback) => {
                if (!socket.user || !data.roomId || typeof data.message !== 'string') {
                    return callback({
                        success: false,
                        error: 'Dati non validi o non autorizzati'
                    });
                }

                if (!socket.rooms.has(data.roomId)) {
                    return callback({
                        success: false,
                        error: 'Non sei nella stanza'
                    });
                }

                console.log('Messaggio ricevuto:', { // Debug
                    room: data.roomId,
                    user: socket.user.username,
                    message: data.message
                });

                chatNamespace.to(data.roomId).emit('chat:message', {
                    user: socket.user,
                    message: data.message,
                    timestamp: new Date(),
                    roomId: data.roomId
                });

                callback({ success: true });
            });

            // Nuovo evento per uscire da una stanza
            socket.on('chat:leave', (roomCode, callback) => {
                if (!socket.user || !roomCode) {
                    return callback({ success: false, error: 'Not authorized or missing room code' });
                }

                const room = activeRooms.get(roomCode);
                if (room && room.users.has(socket.user.id)) {
                    room.users.delete(socket.user.id);
                    socket.leave(roomCode);

                    // Notifica gli altri utenti
                    socket.to(roomCode).emit('chat:user_left', {
                        userId: socket.user.id,
                        username: socket.user.username
                    });

                    // Se la stanza è vuota, cancellala
                    if (room.users.size === 0) {
                        activeRooms.delete(roomCode);
                        axios.delete(`http://localhost:3000/sio/chat/deleteRoom/${roomCode}`)
                            .then(() => {
                                console.log(`Stanza ${roomCode} eliminata`);
                                chatNamespace.emit('chat:room_deleted', { roomCode });
                            })
                            .catch(err => console.error('Errore cancellazione:', err));
                    }

                    callback({ success: true });
                } else {
                    callback({ success: false, error: 'Not in room' });
                }
            });

            // Disconnessione
            socket.on('disconnect', () => {
                if (socket.user) {
                    activeRooms.forEach(async (room, roomCode) => {
                        if (room.users.has(socket.user.id)) {
                            room.users.delete(socket.user.id);

                            if (room.users.size === 0) {
                                try {
                                    // Chiamata al MongoDB server usando roomCode
                                    await axios.delete(`http://localhost:3000/sio/chat/deleteRoom/${roomCode}`);
                                    console.log(`Stanza ${roomCode} eliminata dal DB`);
                                    activeRooms.delete(roomCode);
                                } catch (error) {
                                    console.error('Errore cancellazione stanza:', error.response?.data || error.message);
                                }
                            } else {
                                socket.to(roomCode).emit('chat:user_left', {
                                    userId: socket.user.id,
                                    username: socket.user.username
                                });
                            }
                        }
                    });
                }
            });
        });
    }
};