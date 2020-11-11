const { Schema, model } = require('mongoose')

const message = new Schema({
    type: {
        type: String,
        required: true
    },
    file: {
        type: String,
    },
    text: {
        type: String,
    },
    date: {
        type: Number,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
})

module.exports = model('Message', message);
