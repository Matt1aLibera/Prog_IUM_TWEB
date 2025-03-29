const bcrypt = require('bcryptjs');
const User = require('../models/User');
//registrazione e logut
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            password: hashedPassword
        });

        res.status(201).json({
            user: {
                _id: user._id,
                username: user.username
            }
        });
    } catch (error) {
        res.status(400).json({ error: 'Registrazione fallita' });
    }
};

exports.logout = (req, res) => {
    res.json({ message: 'Logout effettuato' });
};

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