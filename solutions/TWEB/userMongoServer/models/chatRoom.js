const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
    }
}, {
    timestamps: true // Aggiunge createdAt e updatedAt automaticamente
});

// Non serve aggiungere manualmente findByIdAndDelete, è già fornito da Mongoose
module.exports = mongoose.model('ChatRoom', chatRoomSchema);