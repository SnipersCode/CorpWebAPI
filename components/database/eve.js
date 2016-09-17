const r = require('./database');

module.exports.meta = {
  insert: function meta_insert(documents, parent) {
    documents.forEach((document) => document.parent = parent);
    return r.table('eve_meta').insert(documents, {conflict: "update"}).run();
  }
};

module.exports.ships = {
  insert: function ships_insert(ships) {
    return r.table('eve_ships').insert(ships, {conflict: "update"}).run();
  },
  get: function ships_get(ship_id) {
    return r.table('eve_ships').get(ship_id).run();
  }
};

module.exports.ship_groups = {
  insert: function ship_groups_insert(ship_groups) {
    return r.table('eve_ship_groups').insert(ship_groups, {conflict: "update"}).run();
  }
};

module.exports.systems = {
  insert: function systems_insert(systems) {
    return r.table('eve_systems').insert(systems, {conflict: "update"}).run();
  },
  get: function systems_get(system_id) {
    return r.table('eve_systems').get(system_id).run();
  }
};