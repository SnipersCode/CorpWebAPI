const crypto = require('crypto');

const config = {};

config.hostname = process.env.VIRTUAL_HOST || "Anonymous-CorpWebAPI";
config.frontend = {
  uri: process.env.FRONTEND_URI || "http://localhost:9000",
  jwt_endpoint: "/eve-sso"
};
config.db = process.env.RETHINKDB || "localhost";

config.sign_secret = process.env.SIGN_SECRET || crypto.randomBytes(48).toString('hex');

config.https = {
  enable: false,
  private_key_path: '',
  certificate_path: ''
};

config.max_session = "1 day";

config.api  = {
  prices_ttl: 60 * 60 // In seconds. Default an hour.
};

// CREST Settings
config.eve_sso = {
  user_agent: process.env.NAME || "Anonymous" + " running CorpWebAPI",
  client_id: process.env.EVE_CLIENT_ID || "",
  secret_key: process.env.EVE_SECRET_KEY || "",
  // Scope not required
  scope: [
    'characterAccountRead',
    'characterAssetsRead',
    'characterBookmarksRead',
    'characterCalendarRead',
    'characterChatChannelsRead',
    'characterClonesRead',
    'characterContactsRead',
    //'characterContactsWrite',
    'characterContractsRead',
    'characterFactionalWarfareRead',
    'characterFittingsRead',
    'characterFittingsWrite',
    'characterIndustryJobsRead',
    'characterKillsRead',
    'characterLocationRead',
    'characterLoyaltyPointsRead',
    'characterMailRead',
    'characterMarketOrdersRead',
    'characterMedalsRead',
    'characterNavigationWrite',
    'characterNotificationsRead',
    'characterOpportunitiesRead',
    'characterResearchRead',
    'characterSkillsRead',
    'characterStatsRead',
    'characterWalletRead',
    'fleetRead',
    'fleetWrite',
    'remoteClientUI'
  ]
};

config.affiliation = {
  corporation_id: +process.env.CORPORATION_ID || 0,
  alliance_id: +process.env.ALLIANCE_ID || 0
};

module.exports = config;