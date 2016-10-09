const logs = require('../database/logs');
const session = require('../database/session');
const user_db = require('../database/user');
const security = require('../database/security');

const config = require('../../config');
const crest = require('./crest');
const xml = require('./xml');
const cache = require('../database/cache');

// Debug
const util = require('util');

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

function refresh(user_id) {
  return token(user_id)
    .then((token) => crest.user(...token))
    .then((user) => user_db.update(user_format(user)))
    .catch((error) => logs.main('auth', error));
}

module.exports.token = token;

module.exports.refresh = refresh;

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

const affiliation_type = {
  ALLIANCE: Symbol('alliance_affiliations'),
  CORPORATE: Symbol('corporate_affiliations'),
  PERSONAL: Symbol('personal_affiliations')
};

const affiliation_type_name = function type_name(type_id) {
  switch (type_id) {
    case 2:
      return "Corporation";
    break;
    case 16159:
      return "Alliance";
    break;
    default:
      if (type_id <= 1386 && type_id >=1373){
        return "Character";
      } else {
        return "Unknown";
      }
    break;
  }
};

module.exports.affilation_type = affiliation_type;

module.exports.affiliations = function affiliations(user_id, ...types) {
  return cache.check('contacts', user_id)
    .then((cache_map) => {
      // Check cache time
      if (!cache_map.get('contacts')) {
        return refresh(user_id)
          .then((user) => xml.char.ContactList(user.character_id, user.crest_access_token))
          .then((data) => {
            const info = {};
            for (const group of data.eveapi.result[0].rowset) {
              if (group.$.name.endsWith("List")) {
                const list_name = group.$.name;
                const list_type = list_name.length > 11 ? list_name.substr(0, list_name.length - 11) : "personal";
                info[list_type] = [];
                if (group.row) {
                  group.row.forEach((contact) => {
                    info[list_type].push({
                      id: Number(contact.$.contactID),
                      name: contact.$.contactName,
                      type_id: Number(contact.$.contactTypeID),
                      type_name: affiliation_type_name(Number(contact.$.contactTypeID)),
                      standing: Number(contact.$.standing)
                    });
                  })
                }
              }
            }
            cache.update('contacts', new Date(data.eveapi.cachedUntil[0].replace(" ", "T")), user_id);
            return security.affiliations.set(user_id, info);
          })
      } else {
        return Promise.resolve();
      }
    })
    .then(() => security.affiliations.get(user_id))
    .then((info) => {
      const contacts = [];
      for (const type of types){
        const extend = [];
        let type_string = '';
        switch (type) {
          case affiliation_type.ALLIANCE:
            extend.push(...info.alliance);
            type_string = 'alliance';
            break;
          case affiliation_type.CORPORATE:
            extend.push(...info.corporate);
            type_string = 'corporate';
            break;
          case affiliation_type.PERSONAL:
            extend.push(...info.personal);
            type_string = 'personal';
            break;
        }
        extend.forEach((contact) => {
          contact.list = type_string;
        });
        contacts.push(...extend);
      }
      return contacts;
    })
};