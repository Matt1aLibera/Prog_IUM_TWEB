const bcrypt = require('bcryptjs');

const users = [
    { id: 1, username: 'admin', password: bcrypt.hashSync('adminpass', 10), role: 'admin' }
];

async function getUserByUsername(username) {
    return users.find(user => user.username === username);
}

async function getUserById(id) {
    return users.find(user => user.id === id);
}

async function createUser(username, password) {
    const newUser = {
        id: users.length + 1,
        username,
        password: bcrypt.hashSync(password, 10),
        role: 'user' // Tutti gli utenti normali hanno ruolo 'user' di default
    };
    users.push(newUser);
    return newUser;
}

module.exports = { getUserByUsername, getUserById, createUser };
