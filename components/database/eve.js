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
  },
  get_all: function ships_get_all(ship_ids) {
    return r.table('eve_ships').getAll(...ship_ids).run();
  },
  by_name: function find_ship_by_name(name) {
    return r.table('eve_ships').filter(r.row('name').match("(?i)" + name))
      .limit(5).run();
  }
};

module.exports.ship_groups = {
  get_list: function ship_groups_get_all() {
    // Remove shuttles and rookie ships because they don't have proper lower ship group names
    return r.table('eve_ship_groups').filter(
      r.not(r.or(
        r.row('parent_id').eq(391),  // Shuttles
        r.row('parent_id').eq(1815)  // Rookie Ships
      ))
    ).concatMap([r.row.pluck('id', 'name')]).run();
  },
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