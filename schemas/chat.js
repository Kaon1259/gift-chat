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
        userId:{
            type: String,
            required: false,
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
        chatType:{
            type: String,
            required: true,
            default: 'local',
            enum: ['local', 'whisper', 'broadcast'],
        },
        from:{
            type: String,
            required: false,
        },
        to:{
            type: String,
            required: false,
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