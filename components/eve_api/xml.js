const request = require('../core/promises').request;
const xmlParser = require('../core/promises').xmlParser;

const config = require('../../config');

function endpoint_settings(endpoint, access_token = null, no_params = false) {

  if (access_token) {
    let prefix = "&";
    if (no_params) {
      prefix = "?";
    }

    return {
      method: 'GET',
      uri: "https://api.eveonline.com" + endpoint + prefix + "accessToken=" + access_token,
      headers: {
        'User-Agent': config.eve_sso.user_agent
      }
    }

  } else {
    return {
      method: 'GET',
      uri: "https://api.eveonline.com" + endpoint,
      headers: {
        'User-Agent': config.eve_sso.user_agent
      }
    }
  }
}

module.exports.eve = {

  CharacterAffiliation: (character_ids) => {
    return request(endpoint_settings(
      "/eve/CharacterAffiliation.xml.aspx?ids=" + character_ids.join(",")
    )).then(xmlParser);
  }
};

module.exports.char = {

  KillMails: (characterID, access_token) => request(
    endpoint_settings(
      "/char/KillMails.xml.aspx?characterID=" + characterID,
      access_token
    )
  ).then(xmlParser)
};
