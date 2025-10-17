require('dotenv').config();
const session = require('express-session');

const sessionMiddleware = session({                   //session middleware
    resave : false,
    saveUninitialized : false,
    secret : process.env.COOKIE_SECRET,
    cookie :{
        httpOnly : true,
        secure : false,
        },
    },
);

module.exports = sessionMiddleware;