const path = require('path');
const passport = require('passport');

const User = require(path.join(__dirname, '..', 'schemas', 'user'));
const localStrategy = require(path.join(__dirname, '..', 'middlewares', 'localStrategy'));
const kakaoStrategy = require(path.join(__dirname, '..', 'middlewares', 'kakaoStrategy'));

module.exports = () =>{

     //strategy 등록,...
    localStrategy();
    kakaoStrategy();

    passport.serializeUser((user, done)=>{
        console.log(`serializeUser : ${user.id}`);
        done(null, user.id);
    });

    passport.deserializeUser(async(id, done) =>{
        try {
            console.log(`deserializeUser : ${id}`);

            const exUser = await User.findById(id).lean(); // ✅ await 추가

            if (exUser) {
                console.log(`deserializeUser success: ${exUser.email}`);
                done(null, exUser);
            } else {
                console.log(`deserializeUser fail: not found`);
                done(new Error('사용자 정보가 없습니다.'));
            }
        } catch (err) {
            console.error('deserializeUser error:', err);
            done(err);
        }
    });
}