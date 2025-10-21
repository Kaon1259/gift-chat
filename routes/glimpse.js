const path = require('path');
const router = require('express').Router({ mergeParams: true });
const { enterGlimpse } = require(path.join(__dirname, '..', 'controllers'));

router.route('/')
    .get(enterGlimpse);    

module.exports = router;

