require('dotenv').config(); 
const passport = require('passport');
const kakaoStrategy = require('passport-kakao').Strategy;
const bcrypt = require('bcrypt');

const path = require('path');
const User = require(path.join(__dirname, '..', 'schemas', 'user'));
const providerKakao = process.env.KAKAO_PROVIDER;
const clientIdKakao = process.env.KAKAO_CLIENT_ID;
const clientSecretKakao = process.env.KAKAO_CLIENT_SECRET;
const callbackUrlKakao = process.env.KAKAO_CALLBACK

module.exports = () =>{
    console.log(clientIdKakao);
    console.log(clientSecretKakao);
    console.log(callbackUrlKakao);

    passport.use(new kakaoStrategy({
            clientID : clientIdKakao,
            clientSecret : clientSecretKakao,
            callbackURL: callbackUrlKakao,
        }, async(accessToken, refreshToken, profile, done) =>{
            console.log(`kakao profile ${profile}`);

            try{
                const exUser = await User.findOne({  snsId: profile.id, provider: providerKakao });

                console.log(`kakao Login : snsID = ${profile.id} === ${(exUser) ? exUser.snsId : "exUser is null"}`);
                if(exUser){
                    done(null, exUser); 
                }
                else{
                    console.log(`${profile._json?.kakao_account?.email}, ${profile.displayName}, ${profile.id}, ${profile.id} `);
                    const newUser = await User.create({
                        email: profile._json?.kakao_account?.email?.displayName,
                        nick: profile.displayName,
                        snsId: profile.id,
                        provider: providerKakao,
                    })
                    done(null, newUser);   
                }
            }catch(err){
                console.log(err);
                done(err);
            }
        }
    ));
};

