const mongoose = require('mongoose');

const {Schema, Types} = mongoose;

const chatSchema = new Schema({
        room:{
            type: Types.ObjectId,
            required: true,
            ref: 'Room',
        },
        user: {
            type: String,
            required: true,
        },
        color: {
            type: String,
            required: true,
        },
        chat:{
            type: String,
        },
        gif: {
            type: String,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timeseries : true,
    }
);

module.exports = mongoose.model('Chat', chatSchema);