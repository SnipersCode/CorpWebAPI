var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.json({message: 'Welcome to the CorpFramework API. No HTML pages are served.'});
});

module.exports = router;
