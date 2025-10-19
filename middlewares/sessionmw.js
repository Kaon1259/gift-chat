require('dotenv').config();
const path = require('path');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const redisClient = require(path.join(__dirname, 'redisStorage'));

const sessionMiddleware = session({       
    name: process.env.SESSION_NAME || 'sid',            //session middleware
    resave : false,
    saveUninitialized : false,
    secret : process.env.COOKIE_SECRET,
    cookie :{
        // httpOnly : true,
        // secure : false,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',             // 실제 트래픽/도메인에 맞게
        secure: process.env.NODE_ENV === 'production',
        // domain: '.yourdomain.com', // 사용 중이면 반드시 일치
        },
    store: new RedisStore(
            {
                client:redisClient,
                prefix: 'sess:',
                ttl: 60*60,
            }
        ),
    }, 
);

module.exports = sessionMiddleware;
