const mongoose = require('mongoose');
const Schema = mongoose.Schema;
/**
 * Schema for chat rooms stored in MongoDB
 */
const chatRoomSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    topic: {
        type: String,
        required: true,
        enum: ['film', 'attore', 'crew', 'personaggio', 'generale']
    },
    code: {
        type: String,
        required: true,
        unique: true,
        index: true
    }
}, {
    timestamps: true // Aggiunge createdAt e updatedAt automaticamente
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);