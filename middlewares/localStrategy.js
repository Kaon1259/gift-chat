const path = require('path');
const passport = require('passport');
const bcrypt = require('bcrypt');

const LocalStrategy = require('passport-local').Strategy;
const User = require(path.join(__dirname, '..', 'schemas', 'user'));

module.exports = () =>{
    passport.use(new LocalStrategy({
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback: false,
        }, async(email, password, done) =>{
            try{
                const exUser = await User.findOne({ email, provider:'local'});

                console.log(`passport.user: (${exUser})`);
                if(exUser){
                    //check password
                    const result = await bcrypt.compare(password, exUser.password); 
                   
                    if(result){ // result는 이제 true 또는 false 불리언 값입니다.
                        console.log(`localStrategy: exUser = email: ${exUser.email} 로그인 성공`);
                        done(null, exUser); 
                    }
                    else{
                        console.log(`localStrategy: exUser = email: ${exUser.email} 로그인 실패`);
                        done(null, false, {message: '비밀번호가 일치하지 않습니다.'});
                    }
                }
                else{
                    done(null, false, {message: '가입되지 않은 회원 입니다.'});   
                }
            }catch(err){
                console.log(err);
                done(err);
            }
        }
    ));
};

