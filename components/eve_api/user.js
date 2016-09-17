const logs = require('../database/logs');
const session = require('../database/session');
const user_db = require('../database/user');

const config = require('../../config');
const crest = require('./crest');

function user_format(user) {
  const new_user = {};

  new_user.id = user.CharacterID + "-" + user.CharacterOwnerHash;
  new_user.character_id = user.CharacterID;
  new_user.character_name = user.CharacterName;
  new_user.character_owner_hash = user.CharacterOwnerHash;
  new_user.corporation_id = user.CorporationID;
  new_user.corporation_name = user.CorporationName;
  new_user.alliance_id = user.AllianceID;
  new_user.alliance_name = user.AllianceName;
  new_user.crest_access_token = user.CrestAccessToken;
  new_user.crest_refresh_token = user.CrestRefreshToken;
  new_user.crest_token_type = user.CrestTokenType;
  new_user.crest_scopes = user.Scopes.split(" ");
  new_user.expires_on = new Date(user.ExpiresOn);
  new_user.auth_type = user.TokenType;

  return new_user;
}

function token(user_id){
  return user_db.get(user_id).then(
    (user) => {
      if (new Date() < user.expires_on.setSeconds(user.expires_on.getSeconds() - 60)) {
        // Adds 1 minute in case of latency
        return [user.crest_access_token, crest.crestCodes.ACCESS, user.crest_token_type]
      } else {
        return [user.crest_refresh_token, crest.crestCodes.REFRESH, user.crest_token_type]
      }
    });
}

module.exports.token = token;

module.exports.sign_in = function sign_in(auth_code, uuid) {
  return crest.user(auth_code)
    .then((user) => {
      const user_info = user_format(user);
      return user_db.get(user_info.id)
        .then((user_db_info) => {
          if (user_db_info && user_db_info.main_user && user_db_info.main_user !== user_db_info.id){
            return user_db.get(user_db_info.main_user)
              .then((main_user) => session.update(uuid, main_user));
          } else {
            return session.update(uuid, user_info);
          }
        });
    })
    .catch((error) => {
      error.CorpWeb_jwt = uuid;
      if(error instanceof Error){
        logs.main('auth', error.toString());
      } else {
        logs.main('auth', error);
      }
      session.invalidate(uuid);
    });
};

module.exports.associate = function associate(auth_code, user_id) {
  crest.user(auth_code)
    .then((user) => {
      const alt_user = user_format(user);
      alt_user.main_user = user_id; // Only adjust main user on association
      user_db.upsert(alt_user);
      user_db.associate(user_id, user_id);
      logs.auth(user_id, null, "association", "crest", alt_user.character_name, {});
    })
    .catch((error) => logs.main('auth', error));
};

module.exports.refresh = function refresh(user_id) {
  token(user_id)
    .then((token) => crest.user(...token))
    .then((user) => user_db.update(user_format(user)))
    .catch((error) => logs.main('auth', error));
};