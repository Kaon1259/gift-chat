const path = require('path');
const router = require('express').Router({ mergeParams: true });
const { renderFriendShip } = require(path.join(__dirname, '..', 'controllers', 'friend'));
const { isLoggedIn } = require(path.join(__dirname, '..', 'middlewares'));


router.route('/')
    .get(isLoggedIn, renderFriendShip)
    
module.exports = router;

