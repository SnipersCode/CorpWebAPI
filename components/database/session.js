const r = require('./database');
const user_db = require('./user');

module.exports.invalidate = function invalidate(id) {
  return r.table('jwts').get(id).delete().run();
};

module.exports.invalidate_all = function invalidate_all(user_id) {
  return r.table('jwts').filter(r.row('user_id').eq(user_id)).delete().run();
};

module.exports.purge = function purge() {
  return r.table('jwts').delete().run();
};

module.exports.update = function update_user(id, new_user) {
  // Update jwt only after user has been updated
  return user_db.upsert(new_user)
    .then(() => {
        return r.table('jwts').insert({
          id: id,
          user_id: new_user.id,
          name: new_user.character_name,
          character_id: new_user.character_id
        }, {conflict: "update"}).run();
      }
    );
};

module.exports.create = function create(id, timestamp) {
  return r.table('jwts').insert({id: id, timestamp: timestamp}).run();
};

module.exports.verify = function verify(id, client_id) {
  return r.table('jwts').get(id).run().then((result) => {
    if (result) {
      r.table('jwts').get(id).update({client_id: client_id}).run();
      result.client_id = client_id;
    }
    return result;
  });
};

module.exports.changes = function changes(callback) {
  r.table('jwts').changes().run().then(
    (cursor) => {
      cursor.each((err, change) => callback(err, change));
    }
  );
};

module.exports.field_changes = function field_changes(fields, callback) {
  // Watch for session updates
  r.table('jwts').filter(r.row.hasFields(fields)).changes().run().then(
    (cursor) => {
      cursor.each((err, change) => callback(err, change));
    }
  );
};