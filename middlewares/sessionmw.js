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
        httpOnly : true,
        secure : false,
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
