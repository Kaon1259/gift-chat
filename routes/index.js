const path = require('path');
const router = require('express').Router();
const { renderIndex, renderRoom, createRoom } = require(path.join(__dirname, '..', 'controllers'));
const { isLoggedIn, isNotLoggedIn } = require(path.join(__dirname, '..', 'middlewares'));

router.route('/')
    .get(renderIndex);

router.route('/room')
    .get(isLoggedIn, renderRoom)
    .post(isLoggedIn, createRoom);

router.use('/room/:id', require('./chat'));
router.use('/auth', require('./auth'));
    
module.exports = router;