const path = require('path');
const bcrypt = require('bcrypt');
const passport = require('passport');

const User = require(path.join(__dirname, '..', 'schemas', 'user'));

require('dotenv').config(); 

const renderJoin = async(req, res, next) =>{
    res.render('join', {title:'회원가입하기'});
}

const renderLogin = async(req, res, next) =>{
    res.render('login', {
                title:'로그인',
                user: req.user || null,
            });
}

const join = async(req, res, next)=>{
    const {email, nick, password} = req.body;

    console.log(`auth/join : ${email} : ${nick} :${password}`)

    try{
        //1. 계정이 이미 존재하는지 확인
        const exUser = await User.findOne({
            where : {email : email}
        });

        //2.이미 존재하면 가입 페이지로 에러 전달
        if(exUser){
            return res.redirect('/join?error=이미 존재하는 회원 입니다.');
        }

        const hash = await bcrypt.hash(password, 12);
        await User.create({
            email: email,
            nick: nick,
            password: hash,
        });

        return res.redirect('/');

    }catch(err){
        console.log(err);
        return next(err);
    }
};


// const login = (req, res, next)=>{
    
//     console.log(`auth/login : ${req.body.email} : ${req.body.password}`)

//     //'local' Stratergy를 실행하고 (authError, ...) 콜백 함수를 호출해서 전달해 준다...
//     passport.authenticate('local', async(authError, user, info)=>{
//         if(authError){
//             console.log(authError);
//             return next(authError);
//         }

//         if(!user){
//             return res.redirect(`/?error=${info.message}`);
//         }

//          // 1) 세션ID 재발급 (중요!)
//         req.session.regenerate((regenErr) => {
//             if (regenErr) return next(regenErr);
//         });

//         try {
//         // 1) 로그인(세션에 유저 적재)
//         await new Promise((resolve, reject) => {
//             req.login(user, (loginError) => {
//             if (loginError) return reject(loginError);

//             return resolve();
//             });
//         });

//         // 2) (중요) 세션 저장이 끝난 뒤에 리다이렉트 — 레이스컨디션 방지
//         if (req.session) {
//             console.log(`login : ${req.session}, sessionId : ${req.sessionID}`);
//             req.session.save((saveErr) => {
//             if (saveErr) return next(saveErr);

//             return res.redirect('/'); // 성공
//             });
//         } else {
//             // 세션 미들웨어가 없을 때 대비 (개발 중 오류 방지)
//             return res.redirect('/');
//         }
//         } catch (e) {
//         return next(e);
//         }
//     })(req, res, next);
// };

const login = (req, res, next) => {
  passport.authenticate('local', (authError, user, info) => {
    if (authError) return next(authError);
    if (!user) return res.redirect(`/?error=${info?.message || '로그인 실패'}`);

    // 1) 세션ID 재발급 (중요!)
    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);

      // 2) 유저 적재
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        // 3) 세션 저장 후 리다이렉트 (레이스컨디션 방지)
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          return res.redirect('/');
        });
      });
    });
  })(req, res, next);
};


const logout = (req, res, next) => {
    
        // express-session에 설정한 name과 동일해야 합니다.
    const cookieName = process.env.SESSION_NAME || 'connect.sid';

    try {
        req.logout(err => {
        if (err) return next(err);

        if (req.session) {
            const sid = req.sessionID; // 로깅용 (destroy 전에 캡처)
            console.log('logout:req.session (will destroy)', { sid });

            req.session.destroy(destroyError => {
                if (destroyError) return next(destroyError);

                if (!res.headersSent) {
                    // 쿠키는 한 번만, 올바른 이름 + 동일 옵션으로 제거
                    res.clearCookie(cookieName);
                    return res.redirect('/');
                }}
            );
                // 응답은 destroy 콜백에서만 보냄
            return;
        }

        // 세션 객체가 없으면 쿠키만 정리 후 종료
        if (!res.headersSent) {
            res.clearCookie(cookieName);
            return res.redirect('/');
        }
        });
    } catch (err) {
        console.log('로그아웃 처리 중 에러 발생:', err);
        return next(err);
    }
};

module.exports = {renderJoin, renderLogin, join, login, logout};