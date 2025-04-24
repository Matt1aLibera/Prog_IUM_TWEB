const roomHistory = new Map(); // {roomId: Array<message>}
module.exports = (io) => {
    const chatRooms = new Map(); // {roomId: {name: string, users: Set}}

    io.on('connection', (socket) => {
        console.log(`New connection: ${socket.userId}`);

        // Autenticazione automatica dalla sessione
        socket.userId = socket.request.session.user?.id;
        socket.userName = socket.request.session.user?.name;

        if (!socket.userId) {
            socket.disconnect(true);
            return;
        }

        // Gestione stanze
        socket.on('chat:join', (roomConfig) => {
            const roomId = generateRoomId(roomConfig);

            if (!chatRooms.has(roomId)) {
                chatRooms.set(roomId, {
                    name: generateRoomName(roomConfig),
                    users: new Set()
                });
            }

            socket.join(roomId);
            chatRooms.get(roomId).users.add(socket.userId);

            // Notifica agli altri utenti
            socket.to(roomId).emit('chat:user-joined', {
                userId: socket.userId,
                userName: socket.userName
            });

            // Invia storico messaggi (se implementato)
            if (roomHistory.has(roomId)) {
                socket.emit('chat:history', roomHistory.get(roomId));
            }
        });

        // Gestione messaggi
        socket.on('chat:message', (roomId, message) => {
            if (!socket.rooms.has(roomId)) return;

            const messageData = {
                userId: socket.userId,
                userName: socket.userName,
                text: message,
                timestamp: new Date()
            };

            // Salva nel storico (opzionale)
            if (!roomHistory.has(roomId)) {
                roomHistory.set(roomId, []);
            }
            roomHistory.get(roomId).push(messageData);

            // Broadcast
            io.to(roomId).emit('chat:new-message', messageData);
        });

        // Pulizia alla disconnessione
        socket.on('disconnect', () => {
            chatRooms.forEach((room, roomId) => {
                if (room.users.has(socket.userId)) {
                    room.users.delete(socket.userId);
                    socket.to(roomId).emit('chat:user-left', socket.userId);

                    if (room.users.size === 0) {
                        chatRooms.delete(roomId);
                    }
                }
            });
        });
    });

    function generateRoomName(roomConfig) {
        switch(roomConfig.type) {
            case 'film': return `Film: ${roomConfig.filmId}`;
            case 'actor': return `Attore: ${roomConfig.actorId}`;
            case 'character': return `Personaggio: ${roomConfig.character}`;
            default: return `Stanza: ${roomConfig.type}`;
        }
    }

    // Helper functions
    function generateRoomId({type, filmId, actorId, character}) {
        switch(type) {
            case 'film': return `film:${filmId}`;
            case 'film_actor': return `film_actor:${filmId}:${actorId}`;
            case 'character': return `character:${filmId}:${character.toLowerCase()}`;
            default: throw new Error('Invalid room type');
        }
    }

    io.on('connection', (socket) => {
        socket.on('ping', (cb) => cb());

        setInterval(() => {
            socket.emit('ping', () => {});
        }, 30000);
    });
};