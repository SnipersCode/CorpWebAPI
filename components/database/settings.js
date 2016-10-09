r = require('./database');

module.exports.srp_rules = {
  set: function set_srp_rules(target, rule, flags, flags_only) {
    const to_update = {};
    to_update[target] = r.literal(rule);
    to_update.flags = flags;
    if (flags_only){
      return r.table('settings').get("srp_rules").update({flags: flags}).run();
    } else {
      return r.table('settings').get("srp_rules").update(to_update).run();
    }
  },
  get: function get_srp_rules() {
    return r.table('settings').get('srp_rules').default({
      "id": "srp_rules",
      "group": "srp",
      "standard": [[null, 0]]
    }).run();
  },
  remove: function remove_srp_rule(id) {
    if (id != "standard"){
      return r.table('settings').get('srp_rules').replace(r.row.without(id)).run();
    } else {
      return Promise.resolve();
    }
  },
  changes: function changes_srp_rules(callback) {
    r.table('settings').get('srp_rules').changes().run().then(
      (cursor) => {
        cursor.each(callback);
      }
    )
  }
};

module.exports.affiliations = {
  get: function affiliation_get() {
    return r.table('settings').get('affiliations').run();
  },
  set: function affiliation_set(document) {
    document.id = 'affiliations';
    return r.table('settings').insert(document, {conflict: "replace"}).run();
  }
};