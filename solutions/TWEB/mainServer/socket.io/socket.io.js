const activeRooms = new Map();
const axios = require('axios');

module.exports = {
    /**
     * Initialize Socket.IO chat server with event handlers
     * @param {SocketIO.Server} io - Socket.IO server instance
     */
    init: function(io) {
        const chatNamespace = io.of('/chat');

        // Authentication middleware for socket connections
        chatNamespace.use((socket, next) => {
            const { userId, username } = socket.handshake.auth;
            if (userId && username) {
                socket.user = { id: userId, username };
                return next();
            }
            next(new Error('Authentication error'));
        });

        /**
         * Handle new socket connections
         */
        chatNamespace.on('connection', (socket) => {
            console.log(`Utente connesso: ${socket.user.username} (${socket.id})`);

            /**
             * Join or create chat room
             * @param {Object} data - Room data
             * @param {string} data.code - Room ID
             * @param {string} [data.name] - Room name
             * @param {string} [data.topic] - Room topic
             * @param {function} callback - Response callback
             */
            socket.on('chat:join_or_create', (data, callback) => {
                if (!socket.user) return callback({ error: 'Not authenticated' });

                const { code, name, topic } = data;
                let room = activeRooms.get(code);
                const isNewRoom = !room;

                // Create new room if doesn't exist
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

                // Add user to room
                room.users.set(socket.user.id, socket.user.username);
                socket.join(code);

                // Prepare response data
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

                callback(responseData);

                // Notify other room users
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
                    // Broadcast new room creation
                    chatNamespace.emit('chat:room_created', {
                        id: code,
                        name: room.name,
                        topic: room.topic
                    });
                }
            });

            /**
             * Handle new chat messages
             * @param {Object} data - Message data
             * @param {string} data.roomId - Target room ID
             * @param {string} data.message - Message content
             * @param {function} callback - Response callback
             */
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

                // Broadcast message to room
                chatNamespace.to(data.roomId).emit('chat:message', {
                    user: socket.user,
                    message: data.message,
                    timestamp: new Date(),
                    roomId: data.roomId
                });

                callback({ success: true });
            });

            /**
             * Leave chat room
             * @param {string} roomCode - Room ID to leave
             * @param {function} callback - Response callback
             */
            socket.on('chat:leave', (roomCode, callback) => {
                if (!socket.user || !roomCode) {
                    return callback({ success: false, error: 'Not authorized or missing room code' });
                }

                const room = activeRooms.get(roomCode);
                if (room && room.users.has(socket.user.id)) {
                    room.users.delete(socket.user.id);
                    socket.leave(roomCode);

                    // Update remaining users
                    const userList = Array.from(room.users.values());
                    chatNamespace.to(roomCode).emit('chat:room_update', {
                        roomId: roomCode,
                        users: userList,
                        userCount: userList.length
                    });

                    // Notify about user leaving
                    socket.to(roomCode).emit('chat:user_left', {
                        userId: socket.user.id,
                        username: socket.user.username
                    });

                    // Delete empty rooms
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

            /**
             * Handle socket disconnection
             */
            socket.on('disconnect', () => {
                if (socket.user) {
                    activeRooms.forEach(async (room, roomCode) => {
                        if (room.users.has(socket.user.id)) {
                            room.users.delete(socket.user.id);

                            if (room.users.size === 0) {
                                try {
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