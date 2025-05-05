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
            socket.on('chat:join_or_create', (data, callback) => {
                if (!socket.user) return callback({ error: 'Not authenticated' });

                const { code, name, topic } = data;
                let room = activeRooms.get(code);
                const isNewRoom = !room;

                if (isNewRoom) {
                    room = {
                        id: code,
                        name: name || `Stanza ${code}`,
                        topic: topic || 'generale',
                        users: new Map(),
                        createdAt: new Date()
                    };
                    activeRooms.set(code, room);
                }

                // Aggiungi l'utente alla stanza
                room.users.set(socket.user.id, socket.user.username);
                socket.join(code);

                // Prepara i dati per la risposta
                const userList = Array.from(room.users.values());
                const responseData = {
                    success: true,
                    isNewRoom,
                    roomData: {
                        id: code,
                        name: room.name,
                        topic: room.topic,
                        users: userList,
                        userCount: userList.length
                    }
                };

                // Invia prima la risposta al client che si è unito
                callback(responseData);

                // Poi notifica tutti gli altri nella stanza
                if (!isNewRoom) {
                    chatNamespace.to(code).emit('chat:room_update', {
                        roomId: code,
                        users: userList,
                        userCount: userList.length
                    });

                    socket.to(code).emit('chat:user_joined', {
                        userId: socket.user.id,
                        username: socket.user.username
                    });
                } else {
                    // Per le nuove stanze, emetti l'evento room_created
                    chatNamespace.emit('chat:room_created', {
                        id: code,
                        name: room.name,
                        topic: room.topic
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

                    // Invia aggiornamento a tutti nella stanza
                    const userList = Array.from(room.users.values());
                    chatNamespace.to(roomCode).emit('chat:room_update', {
                        roomId: roomCode,
                        users: userList,
                        userCount: userList.length
                    });

                    // Notifica specifica per l'utente uscito
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