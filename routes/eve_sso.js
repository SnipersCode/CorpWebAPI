const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const uuid = require('node-uuid');
const session = require('../components/database/session');

const config = require('../config');
const crest = require('../components/eve_api/crest');
const crest_user = require('../components/eve_api/user');

router.get('/', (req, res, next) => {

  // Redirect to EVE Online login endpoint
  const random_string = crypto.randomBytes(48).toString('hex');
  res.cookie('eve_sso_state', random_string, {'httpOnly': true, 'signed': true});
  res.redirect(crest.redirectUri(
    encodeURIComponent(config.frontend.uri + config.frontend.jwt_endpoint),
    config.eve_sso.client_id, config.eve_sso.scope.join(" "),
    random_string, config.https.enable));
});

router.get('/authorize', (req, res, next) => {
  // Validate authorization code

  // Validate state
  if (req.signedCookies.eve_sso_state !== req.query.state) {
    res.json({error: "http.state", message: 'Error in state given. Try clearing your cookies.'});
    return
  }
  const auth_code = req.query.code;

  // Immediately send jwt with uuid that can be used to connect to websocket
  const connection_uuid = uuid.v4();
  const timestamp = new Date();
  res.json({
    jwt: jwt.sign({
      user_id: null,
      iat: Math.floor(timestamp.getTime() / 1000)
    }, config.sign_secret, {
      expiresIn: config.max_session,
      audience: "CorpWeb:Main",
      issuer: config.hostname,
      subject: "CorpWeb:Auth",
      jwtid: connection_uuid
    })
  });
  session.create(connection_uuid, timestamp)
    .then(() => crest_user.sign_in(auth_code, connection_uuid));

});

router.get('/associate', (req, res, next) => {
  // Validate authorization code

  // Validate state
  if (req.signedCookies.eve_sso_state !== req.query.state) {
    res.json({error: "http.state", message: 'Error in state given. Try clearing your cookies.'});
    return
  }

  crest_user.associate(req.query.code, req.query.user_id);
  res.json({jwt: null, module: "http", endpoint: "associate", payload: "Association queued."});

});

/*router.get('/refresh', (req, res, next) => {
  crest_user.refresh("93256039-PfsAGtUWW1O+HM63xGnifu9ziJY=");
  res.json({'message': 'refreshed'});
});*/

module.exports = router;