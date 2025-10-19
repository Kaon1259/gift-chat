const jwtWebToken = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const path = require('path');
//const LimiterPolicy = require(path.join(__dirname, 'LimiterPolicy'));

exports.isLoggedIn = (req, res, next) =>{
    console.log(`isLoggedIn: `);
    if(req.isAuthenticated()){
        console.log('isLoggedIn: loggined');
        return next();
    }else{
        console.log('Login need');
        return res.render('join', {title: '회원가입'});
    }
};

exports.isNotLoggedIn = (req, res, next) =>{
    if(!req.isAuthenticated()){
        console.log('isNotLoggedIn: Not loggined');
        return next();
    }else{
        const message = encodeURIComponent('로그인 되어 있습니다.')
        console.log(`error = ${message}`);
        res.redirect(`/?error=${message}`);
    }
};

exports.verifyToken = (req, res, next) =>{
    try{
        const auth = req.get('authorization') || req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();

        console.log(`verifyToken auth: ${auth}`);
        console.log(`verifyToken token : ${token}`);

        res.locals.decoded = jwtWebToken.verify(token, process.env.JWT_SECRET);

        console.log(`verifyToken : ${res.locals.decoded.id} : ${res.locals.decoded.nick}`);
        return next();
    }catch(err){
        if(err.name === 'TokenExpiredError'){
            return res.status(419).json({
                code: 419,
                message: '토큰이 만료되었습니다.',
            })
        }

        return res.status(401).json({
            code: 401,
            message: '유효하지 않은 토큰 입니다.',
        });
    }
};

// exports.chooseLimiter = (req, res, next) => {
//     const type = req.domainPlan;
//     console.log(`chooseLimiter : ${type}`);

//     const limiter = LimiterPolicy[type];

//     if(limiter){
//         console.log(`chooseLimiter : ${limiter}`);
//         return limiter(req, res, next);
//     }
    
//     next();
// }

// exports.apiLimiter = rateLimit({
//     windowMs : 60 * 1000, //1분
//     max: 5,
//     handler(req, res){
//         res.status(this.statusCode).json({
//             code: this.statusCode, //기본값 429
//             message: 'Normal: 1분에 한번만 요청할 수 있습니다.',
//         });
//     }
// });


// exports.apiLimiterForNormal = rateLimit({
//     windowMs : 60 * 1000, //1분
//     max: 5,
//     handler(req, res){
//         res.status(this.statusCode).json({
//             code: this.statusCode, //기본값 429
//             message: 'Normal: 1분에 한번만 요청할 수 있습니다.',
//         });
//     }
// });


// exports.apiLimiterForPremium = rateLimit({
//     windowMs : 60 * 1000, //1분
//     max: 5,
//     handler(req, res){
//         res.status(this.statusCode).json({
//             code: this.statusCode, //기본값 429
//             message: 'Premium: 1분에 10만 요청할 수 있습니다.',
//         });
//     }
// });

exports.deprecated = (req, res) =>{
    res.status(410).json({
        code: 410,
        message: '새로운 버전이 나왔습니다. 새로운 버전을 사용하세요',
    });
};


// exports.corsWhenDomainMatches = async (req, res, next) => {
//     try {
//         const origin = req.get('origin');
//         if (!origin) {
//         return res.status(400).json({
//             code: 400,
//             message: 'Origin 헤더가 없습니다.',
//         });
//         }

//         const host = new URL(origin).host;
//         console.log(`corsWhenDomainMatches: origin=${origin}, host=${host}`);

//         const domain = await Domain.findOne({ where: { host } });

//         if (domain) {
//         req.domainPlan = domain.type; // 이후 rateLimit에서 참고
//         console.log(`corsWhenDomainMatches: domainPlan=${req.domainPlan}`);

//         cors({
//             origin,
//             credentials: true,
//         })(req, res, next); // ✅ cors 허용

//         } else {
//         console.warn(`차단된 Origin: ${origin}`);
//         return res.status(403).json({
//             code: 403,
//             message: '허용되지 않은 도메인입니다.',
//         });
//         }
//     } catch (err) {
//         console.error('CORS 도메인 확인 중 오류:', err);
//         return res.status(500).json({
//         code: 500,
//         message: '서버 내부 오류',
//         });
//     }
// };
