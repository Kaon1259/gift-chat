const path = require('path');
const router = require('express').Router({ mergeParams: true });
const { renderFriendShip, renderFriendShipRequest, accept, cancel, unblock, block, reject } = require(path.join(__dirname, '..', 'controllers', 'friend'));
const { isLoggedIn } = require(path.join(__dirname, '..', 'middlewares'));


router.route('/')
    .get(isLoggedIn, renderFriendShip)

router.route('/request')
    .post(isLoggedIn, renderFriendShipRequest)

router.route('/accept/:id')
    .post(isLoggedIn, accept)

router.route('/cancel/:id')
    .post(isLoggedIn, cancel)

router.route('/unblock/:id')
    .post(isLoggedIn, unblock)

router.route('/block/:id')
    .post(isLoggedIn, block)

router.route('/reject/:id')
    .post(isLoggedIn, reject)

module.exports = router;

