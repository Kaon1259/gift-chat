const mongoose = require("mongoose");
require('dotenv').config();

const mongoDbConnect = async () => {
    try {
        if(process.env.MODE_ENV !== 'production'){
            mongoose.set('debug', true);
        }
        const connect = await mongoose.connect(process.env.MONGGO_DB_CONNECT_TO_MYCHAT)
            .then(()=>{
                console.log("몽고 DB 접속 성공");
            })
            .catch((err)=>{
                console.log(`몽고 DB 에러 : ${err}`);
            })
        
        mongoose.connection.on('error', (error)=>{
            console.log(`몽공디비 연결에러 ${error}`);
        });

        mongoose.connection.on('disconnected', ()=>{
            console.error('몽고디비 연결이 끓겼습니다. 연결을 재 시도합니다.');
            connect();
        })

    } catch (error) {
        console.error(error);
        throw error;
    }   
};

module.exports = mongoDbConnect;