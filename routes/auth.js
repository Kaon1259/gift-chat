const path = require('path');
const router = require('express').Router({ mergeParams: true });
const { renderJoin, renderLogin, join, login, kakaoLogin, kakaoCallback, logout } = require(path.join(__dirname, '..', 'controllers', 'auth'));
const { isLoggedIn, isNotLoggedIn } = require(path.join(__dirname, '..', 'middlewares'));


router.route('/join')
    .get(isNotLoggedIn, renderJoin)
    .post(isNotLoggedIn, join);

router.route('/login')
    .get(isNotLoggedIn, renderLogin)
    .post(isNotLoggedIn, login);

    //kakao login/logout
router.route('/kakao')
    .get(kakaoLogin);

router.route('/kakao/callback')
    .get(kakaoCallback);

router.route('/logout')
    .get(isLoggedIn, logout);    

module.exports = router;

