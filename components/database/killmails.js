const r = require('./database');
const cache = require('./cache');

const crest = require('../eve_api/crest');
const xml = require('../eve_api/xml');

const eve_user = require('../eve_api/user');
const prices = require('./prices');

function read_kills(token, user) {
  return xml.char.KillMails(user.character_id, token.access_token)
    .then((data) => {
      const kills = data.eveapi.result[0].rowset[0].row;
      const losses = [];
      // Check if user has at least one kill/loss
      if (kills) {
        kills.forEach((kill) => {
          const info = {
            id: Number(kill.$.killID),
            solar_system_id: Number(kill.$.solarSystemID),
            kill_time: new Date(kill.$.killTime.replace(" ", "T")),
            submitter_id: user.id,
            submitter_name: user.character_name,
            ship_item_id: Number(kill.victim[0].$.shipTypeID),
            victim: {
              alliance_id: Number(kill.victim[0].$.allianceID),
              alliance_name: kill.victim[0].$.allianceName,
              character_id: Number(kill.victim[0].$.characterID),
              character_name: kill.victim[0].$.characterName,
              corporation_id: Number(kill.victim[0].$.corporationID),
              corporation_name: kill.victim[0].$.corporationName
            },
            items: []
          };
          // Find items
          kill.rowset.forEach((data) => {
            if (data.$.name === "items" && data.row) {
              data.row.forEach((item) => {
                info.items.push({
                  flag: Number(item.$.flag),
                  count_destroyed: Number(item.$.qtyDestroyed),
                  count_dropped: Number(item.$.qtyDropped),
                  singleton: Boolean(Number(item.$.singleton)),
                  item_id: Number(item.$.typeID)
                })
              })
            }
          });
          // Ensure kill is a loss
          if (info.victim.character_id == user.character_id) {
            losses.push(info);
          }
        })
      }
      // Update Database
      cache.update("killmails", new Date(data.eveapi.cachedUntil[0].replace(" ", "T")), user.id);
      return r.table('eve_killmails').insert(losses, {conflict: "update"}).run();
    });
}

module.exports.get = function insert(user_id, character_id, character_name) {
  return cache.check('killmails', user_id)
    .then((cache_map) => {
      // Check cache time
      if (!cache_map.get('killmails')) {
        return eve_user.token(user_id)
          .then((user_token) => crest.authenticate(...user_token))
          .then((token) => read_kills(token, {
            id: user_id,
            character_id: character_id,
            character_name: character_name
          }));
      } else {
        return Promise.resolve();
      }
    })
    .then(() =>
      r.table('eve_killmails').getAll(character_id, {index: "srp_user_id"})
        .filter(r.row('kill_time').gt(r.now().sub(2678400))).orderBy(r.desc('kill_time')).run()   // Limit to 1 month
    );
};

module.exports.id_get = function id_get(kill_ids) {
  return r.table('eve_killmails').getAll(...kill_ids).run();
};

module.exports.all_submitted = function all_submitted() {
  return r.table('srp').run();
};

module.exports.changes = function changes(callback) {
  r.table('srp').changes().run().then((cursor) => {
    cursor.each(callback)
  });
};

module.exports.submit = function submit(documents) {
  const kill_ids = documents.map((kill) => kill.id);
  r.table('eve_killmails').getAll(...kill_ids).update({submitted: true}).run();
  return r.table('srp').insert(documents, {conflict: "update"}).run();
};

module.exports.update = function update(document) {
  return r.table('srp').get(document.id).update(document).run();
};