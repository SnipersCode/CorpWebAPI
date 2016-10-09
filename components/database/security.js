const r = require('./database');

module.exports.affiliations = {
  get: function get_affiliations(user_id) {
    return r.table('security').get(user_id).pluck('affiliations').run().then((result) => result.affiliations);
  },
  set: function set_affiliations(user_id, document) {
    return r.table('security').insert({
      id: user_id,
      affiliations: document
    }, {conflict: "update"}).run();
  }
};