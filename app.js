const express = require('express');
const app = express();
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const passportConfig = require(path.join(__dirname, 'passport'))
const expressLayouts = require('express-ejs-layouts');
const sessionMiddleware = require(path.join(__dirname, 'middlewares', 'sessionmw'));
//const webSocket = require(path.join(__dirname,'middlewares', 'socket'));
const webSocket = require(path.join(__dirname,'middlewares', 'socketio'));
const dbConnect = require(path.join(__dirname,'middlewares', 'mongoDbConnect'));
const ColorHash = require('color-hash').default;

require('dotenv').config();
app.set('port', process.env.PORT || 8005);
app.set('cookieSecret', process.env.COOKIE_SECRET);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layouts/layout');    //rendering시 layout을 생략할 수 있다. 
app.use('/gif', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);

//middleware 등록
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser(app.get('cookieSecret')));
app.use(sessionMiddleware);

passportConfig();
app.use(passport.initialize());
app.use(passport.session());

//before router...
app.use((req, res, next)=>{
    console.log(`router before`)
    if(req.user){
        if(!req.session.color){
            const colorHash = new ColorHash();
            req.session.color = colorHash.hex(req.session);
            console.log(`session.color = ${req.session.color} sessionid: ${req.sessionID}`);
        }
        console.log(`app.use((req, res, next) : ${req.user ? req.user.id : 'not logged in'}`);

        if (!res.locals) res.locals = {};
        res.locals.user = req.user ? req.user : null ;
        console.log(`res.locals.user : ${res.locals.user}`);
    }
    next();
});

//index router,....
app.use('/', require('./routes'));

//after routing
app.use((req, res, next)=>{
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

//error routing
app.use((err, req, res, next)=>{
    res.locals.message = req.message;
    res.locals.error = process.env.MODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error', {title: '에러'});
});

//express server listening
const server = app.listen(app.get('port'), ()=>{
    console.log(`${app.get('port')} 포트에서 대기중`)
})
.on('close', ()=>{
    console.log(`${app.get('port')} 포트 Close`)
})
.on('error', (err)=>{
    console.log(`${app.get('port')} : error : ${err}`)
});

//express server connect to webSocket,...
webSocket(server, app, sessionMiddleware);

dbConnect();