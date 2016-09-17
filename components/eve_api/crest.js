const request = require('../core/promises').request;

const config = require('../../config');
const eve_xml = require('./xml');

// Crest Code Types
const crest_codes = {
  AUTH: Symbol('auth_code'),
  REFRESH: Symbol('refresh_code'),
  ACCESS: Symbol('access_code')
};
module.exports.crestCodes = crest_codes;

function token_settings(code, code_type) {

  let form = {};
  if (code_type === crest_codes.AUTH) {
    form.grant_type = "authorization_code";
    form.code = code;
  } else {
    form.grant_type = "refresh_token";
    form.refresh_token = code;
  }

  return {
    method: 'POST',
    uri: 'https://login.eveonline.com/oauth/token',
    form: form,
    headers: {
      'Authorization': 'Basic ' + new Buffer(config.eve_sso.client_id + ":" + config.eve_sso.secret_key)
        .toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': 'login.eveonline.com'
    },
    json: true
  }
}

function endpoint_settings(uri, token) {
  return {
    method: 'GET',
    uri: uri,
    headers: {
      'User-Agent': config.eve_sso.user_agent,
      'Authorization': token.token_type + " " + token.access_token,
      'Host': 'crest-tq.eveonline.com'
    },
    json: true
  }
}

function verify_settings(token) {
  return {
    method: 'GET',
    uri: 'https://login.eveonline.com/oauth/verify',
    headers: {
      'Authorization': token.token_type + " " + token.access_token,
      'Host': 'login.eveonline.com'
    },
    json: true
  }
}

function authenticate(code, code_type, token_type) {
  if (code_type !== crest_codes.ACCESS) {
    return request(token_settings(code, code_type)); // Returns SSO token
  } else {
    return Promise.resolve({
      access_token: code,
      token_type: token_type
    }); // Return formatted token if access code
  }
}

function verify(code, code_type, token_type) {
  return authenticate(code, code_type, token_type)
    .then((token) => {
      return request(verify_settings(token))
        .then((verification_data) => {
          verification_data.CrestAccessToken = token.access_token;
          verification_data.CrestRefreshToken = token.refresh_token;
          verification_data.CrestTokenType = token.token_type;
          return verification_data;
        });
    });
}

module.exports.redirectUri = function redirect_uri(redirect_uri, client_id, scope, state) {
  return "https://login.eveonline.com/oauth/authorize/" +
    "?response_type=code" +
    "&redirect_uri=" + redirect_uri +
    "&client_id=" + client_id +
    "&scope=" + scope +
    "&state=" + state;
};

module.exports.authenticate = authenticate;

module.exports.user = function user(code, code_type = crest_codes.AUTH, token_type = 'Bearer') {
  return verify(code, code_type, token_type)
    .then((user) => {
      //noinspection JSUnresolvedVariable
      return eve_xml.eve.CharacterAffiliation([user.CharacterID])
        .then((xml_res) => {
          // Parse xml_res
          //noinspection JSUnresolvedVariable
          user.CorporationID = parseInt(xml_res.eveapi.result[0].rowset[0].row[0].$.corporationID);
          //noinspection JSUnresolvedVariable
          user.CorporationName = xml_res.eveapi.result[0].rowset[0].row[0].$.corporationName;
          //noinspection JSUnresolvedVariable
          user.AllianceID = parseInt(xml_res.eveapi.result[0].rowset[0].row[0].$.allianceID);
          //noinspection JSUnresolvedVariable
          user.AllianceName = xml_res.eveapi.result[0].rowset[0].row[0].$.allianceName;

          return user;
        });
    });
};

module.exports.endpoint = function endpoint(uri, code = null, code_type = crest_codes.REFRESH, token_type = 'Bearer') {
  if (code) {
    return authenticate(code, code_type, token_type)
      .then((token) => {
        return request(endpoint_settings(uri, token));  // Returns endpoint data
      });
  } else {
    return request({
      method: 'GET',
      uri: uri,
      headers: {
        'User-Agent': config.eve_sso.user_agent,
        'Host': 'crest-tq.eveonline.com'
      },
      json: true
    });
  }
};
