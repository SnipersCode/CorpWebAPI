r = require('./database');

module.exports.srp_rules = {
  set: function set_srp_rules(all_rules) {
    all_rules.id = 'srp_rules';
    all_rules.group = 'srp';
    return r.table('settings').insert(all_rules).run();
  },
  get: function get_srp_rules() {
    return r.table('settings').get('srp_rules').default({
      "id": "srp_rules",
      "group": "srp",
      "standard": [[null, 0]]
    }).run();
  },
  changes: function changes_srp_rules(callback) {
    r.table('settings').get('srp_rules').changes().run().then(
      (cursor) => {
        cursor.each(callback);
      }
    )
  }
};