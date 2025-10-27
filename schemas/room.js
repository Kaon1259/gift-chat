const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
        title:{
            type: String,
            required: true,
        },
        max: {
            type: Number,
            required: true,
            default : 10,
            min: 2,
        },
        current: {
            type: Number,
            required: true,
            default : 0,
            min: 0,
        },
        owner:{
            type: String,
            required: true,
        },
        ownerId:{
            type: String,
            required : false,
        },
        ownerColor: {
            type: String,
            required: true,
            default: "#000000",
        },
        password: {
            type: String,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        status:{
            type: String,
            required: true,
            default: 'on',
            enum: ['on', 'off'],
        }
    },
    {
        timestamps : true,
    }
);

module.exports = mongoose.model('Room', roomSchema);