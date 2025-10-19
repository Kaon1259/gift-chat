const path = require('path');
const router = require('express').Router({ mergeParams: true });
const { renderJoin, renderLogin, join, login, logout } = require(path.join(__dirname, '..', 'controllers', 'auth'));
const { isLoggedIn, isNotLoggedIn } = require(path.join(__dirname, '..', 'middlewares'));


router.route('/join')
    .get(isNotLoggedIn, renderJoin)
    .post(isNotLoggedIn, join);

router.route('/login')
    .get(isNotLoggedIn, renderLogin)
    .post(isNotLoggedIn, login);

router.route('/logout')
    .get(isLoggedIn, logout);    

module.exports = router;

