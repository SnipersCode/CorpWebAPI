r = require('./database');

module.exports.upsert = function upsert(new_user) {
  // Update jwt only after user has been updated
  return r.table('users').insert(new_user, {conflict: "update"}).run();
};

module.exports.update = function update(new_user) {
  return r.table('users').get(new_user.id).update(new_user).run();
};

module.exports.associate = function associate(user_id, main_user_id) {
  return r.table('users').get(user_id).update({main_user: main_user_id}).run();
};

module.exports.get = function get(user_id) {
  return r.table('users').get(user_id).run();
};

module.exports.auth_groups = function auth_groups(user_id) {
  return r.table('users').get(user_id).run()
    .then(
      (user) => {
        return user.auth_groups; // Returns list of auth groups
      }
    );
};

module.exports.add_groups = function add_groups(user_id, groups) {
  return r.table('users').get(user_id).update({
    auth_groups: r.row('auth_groups').setUnion(groups).default(groups)
  }).run();
};

module.exports.remove_groups = function remove_groups(user_id, groups) {
  return r.table('users').get(user_id).update({
    auth_groups: r.row('auth_groups').setDifference(groups).default([])
  }).run();
};

module.exports.group_changes = function group_changes(callback) {
  r.table('users').filter(r.row('auth_groups')).changes().run().then(
    (cursor) => {
      cursor.each((err, change) => callback(err, change));
    }
  );
};

module.exports.associate_changes = function associate_changes(callback) {
  r.table('users').filter(r.row('main_user')).changes().run().then(
    (cursor) => {
      cursor.each(callback);
    }
  );
};

module.exports.associations = function associations(user_id) {
  return r.table('users').getAll(user_id, {index: "main_user"})
    .pluck(["id", "character_id", "character_name", "corporation_name", "alliance_name"]).run();
};

module.exports.update_affiliations = function update_affiliations(user_id) {
  return r.table('settings').insert(
    r.table('users').get(user_id).pluck(["corporation_id", "alliance_id"]).merge({"id": "affiliations"})
  , {conflict: "update"}).run();
};

module.exports.get_affiliations = function get_affiliations() {
  return r.table('settings').get('affiliations').run();
};