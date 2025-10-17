const path = require('path');
const router = require('express').Router();
const { renderMain, renderRoom, createRoom, enterRoom, sendChat, broadcastChat, sendGif } = require(path.join(__dirname, '..', 'controllers'));
const upload = require(path.join(__dirname, '..', 'middlewares', 'upload')); // multer 설정(이미 만드신 것)

router.route('/')
    .get(renderMain);

router.route('/room')
    .get(renderRoom)
    .post(createRoom);

// router.route('/room/:id')
//     .get(enterRoom);

// router.route('/room/:id/chat')
//     .post(sendChat);

// router.route('/room/:id/broadcastchat')
//     .post(broadcastChat);

// router.route('/room/:id/gif')
//     .post(upload.single('gif'), sendGif);

router.use('/room/:id', require('./chat'));
    
module.exports = router;