const User = require('../models/User');
/**
 * POST /auth/register - Registers a new user
 * @param {string} username - Desired username (min 3 chars)
 * @param {string} password - User password (min 6 chars)
 * @param {string} confirmPassword - Must match password
 * @returns {Object} 201 - { success: true, user: { id, username, role } }
 * @throws {400} Invalid input (missing fields, password mismatch, username taken)
 * @throws {500} Server error during registration
 */
exports.register = async (req, res) => {
    try {
        const { username, password, confirmPassword } = req.body;

        // 1. Validazione avanzata
        if (!username?.trim() || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Compila tutti i campi',
                field: !username?.trim() ? 'username' :
                    (!password ? 'password' : 'confirmPassword')
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Le password non coincidono',
                field: 'confirmPassword'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La password deve contenere almeno 6 caratteri',
                field: 'password'
            });
        }

        // 2. Verifica esistenza utente (case insensitive)
        const existingUser = await User.findOne({
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Username già in uso',
                field: 'username'
            });
        }

        // 3. Creazione utente
        const newUser = await User.create({ username, password });

        // 4. Risposta
        res.status(201).json({
            success: true,
            user: {
                id: newUser._id,
                username: newUser.username,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Errore registrazione:', error);

        // Gestione errori migliorata
        const errorResponse = {
            success: false,
            error: 'Errore durante la registrazione'
        };

        if (error.name === 'ValidationError') {
            errorResponse.error = error.message;
            errorResponse.field = Object.keys(error.errors)[0];
            return res.status(400).json(errorResponse);
        }

        if (error.code === 11000) {
            errorResponse.error = 'Username già registrato';
            errorResponse.field = 'username';
            return res.status(400).json(errorResponse);
        }

        res.status(500).json(errorResponse);
    }
};
/**
 * POST /auth/logout - Terminates user session
 * @returns {Object} 200 - { success: true, message: string }
 * @throws {500} Server error during session destruction
 */
exports.logout = (req, res) => {
    try {
        // Distruggi la sessione
        req.session.destroy(err => {
            if (err) {
                console.error('Errore durante il logout:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Errore durante il logout'
                });
            }

            // Pulisci il cookie (se usi express-session)
            res.clearCookie('connect.sid');

            res.json({
                success: true,
                message: 'Logout effettuato con successo'
            });
        });
    } catch (error) {
        console.error('Errore durante il logout:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

/**
 * GET /auth/:id - Retrieves user by ID
 * @param {string} id - User ID
 * @returns {Object} 200 - { user: { id, username, role } }
 * @throws {404} User not found
 * @throws {500} Server error during fetch
 */
exports.id = async (req, res) => {
    console.log('Fetching user with ID:', req.params.id); // Debug
    try {
        const user = await User.findById(req.params.id); // Esempio con Mongoose
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('Found user:', { _id: user._id, username: user.username }); // Debug
        res.json({
            user: {
                _id: user._id.toString(), // Converti ObjectId
                username: user.username,
                role: user.role
                // Altri campi NECESSARI
            }
        });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: error.message });
    }
};