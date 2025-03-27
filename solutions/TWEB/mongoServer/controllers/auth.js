const User = require('../models/User');

exports.verify = async (req, res) => {
    console.log('\n=== NUOVA RICHIESTA DI VERIFICA ===');
    console.log('Dati ricevuti:', {
        username: req.body.username,
        password: '••••••' // Mask per sicurezza
    });

    try {
        const { username, password } = req.body;

        // 1. Cerca l'utente
        console.log(`Cerco utente: ${username}`);
        const user = await User.findOne({ username });

        if (!user) {
            console.log('Utente non trovato');
            return res.status(401).json({
                success: false,
                error: 'Credenziali non valide'
            });
        }

        // 2. Verifica password
        console.log('Verifica password in corso...');
        const isPasswordValid = await user.verifyPassword(password);

        if (!isPasswordValid) {
            console.log('Password non valida');
            return res.status(401).json({
                success: false,
                error: 'Credenziali non valide'
            });
        }

        // 3. Risposta di successo
        console.log(`Autenticazione riuscita per: ${user.username}`);
        res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Errore durante la verifica:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
};

