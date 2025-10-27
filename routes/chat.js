const path = require('path');
const router = require('express').Router({ mergeParams: true });
const { enterRoom, sendChat, broadcastChat, sendGif, whisperChat, leave, removeRoom} = require(path.join(__dirname, '..', 'controllers'));
const upload = require(path.join(__dirname, '..', 'middlewares', 'upload')); // multer 설정(이미 만드신 것)


router.route('/')
    .get(enterRoom);

router.route('/chat')
    .post(sendChat);

router.route('/broadcastchat')
    .post(broadcastChat);

router.route('/whisperchat')
    .post(whisperChat);

router.route('/gif')
    .post(upload.single('gif'), sendGif);
    
router.route('/leave')
    .post(leave);

router.route('/leave')
    .post(leave);

router.route('/delete/:password')
    .get(removeRoom);


module.exports = router;

