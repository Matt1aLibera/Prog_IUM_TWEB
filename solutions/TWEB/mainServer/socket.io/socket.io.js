const activeRooms = new Map();

module.exports = {
    init: function (io) {
        io.on('connection', (socket) => {
            const chatNamespace = io.of('/chat');
            chatNamespace.on('connection', (socket) => {
                console.log(`Connesso al namespace /chat: ${socket.id}`);

                // 1. Ricevi i dati utente dal client
                socket.on('init', (userData, callback) => {
                    // 2. Assegna i dati utente al socket
                    socket.user = {
                        id: userData.id,
                        username: userData.username
                    };

                    console.log(`User initialized: ${socket.user.username}`);
                    callback({success: true});
                });

                // 3. Timeout per autenticazione
                const authTimeout = setTimeout(() => {
                    if (!socket.user) {
                        socket.disconnect();
                    }
                }, 5000);

                // 4. Gestione stanze (modificata)
                socket.on('chat:join', (roomId, callback) => {
                    if (!socket.user) {
                        return callback({success: false, error: 'Not authenticated'});
                    }

                    // [RESTANTE LOGICA ESISTENTE...]
                    const room = activeRooms.get(roomId) || {
                        name: `Stanza ${roomId}`,
                        users: new Set()
                    };

                    room.users.add(socket.user.id);
                    activeRooms.set(roomId, room);

                    socket.join(roomId);
                    callback({
                        success: true,
                        roomData: {
                            id: roomId,
                            name: room.name,
                            users: Array.from(room.users)
                        }
                    });

                    socket.to(roomId).emit('chat:user_joined', {
                        userId: socket.user.id,
                        username: socket.user.username
                    });
                });

                // [ALTRI EVENTI ESISTENTI...]

                socket.on('disconnect', () => {
                    clearTimeout(authTimeout);
                    if (socket.user) {
                        activeRooms.forEach((room, roomId) => {
                            if (room.users.has(socket.user.id)) {
                                room.users.delete(socket.user.id);
                                io.to(roomId).emit('chat:user_left', {
                                    userId: socket.user.id
                                });
                            }
                        });
                    }
                });
            });
        });
    }
};