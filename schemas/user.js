const mongoose = require('mongoose');

const {Schema, Types} = mongoose;

const userSchema = new Schema({
        email:{
            type: String,
            required: false,
            unique: true,
            trim: true,
            lowercase:true,
        },
        nick: {
            type: String,
            required: false,
        },
        password:{
            type: String,
            required: false,
        },
        provider: {
            type: String,
            required: true,
            default: 'local',
            enum: ['local', 'kakao', 'naver', 'google'],
        },
        snsId: {
            type: String,
            required: false,
        },
    },
    {
        timestamps : true,
    }
);

module.exports = mongoose.model('User', userSchema);