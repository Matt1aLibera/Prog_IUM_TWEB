const User = require('../models/User');

module.exports = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });

        if (!adminExists) {
            const admin = new User({
                username: 'admin',
                password: 'admin123', // Verrà hashato automaticamente dal pre-save hook
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Admin creato automaticamente');
            return { created: true };
        }

        console.log('ℹ️ Admin già esistente nel database');
        return { created: false };
    } catch (error) {
        console.error('❌ Errore durante la creazione automatica dell\'admin:', error);
        throw error; // Rilancia l'errore per gestirlo a livello superiore
    }
};