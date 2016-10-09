const r = require('./database');

module.exports.upsert = function upsert(new_user) {
  // Update jwt only after user has been updated
  return r.table('users').insert(new_user, {conflict: "update"}).run();
};

module.exports.update = function update(new_user) {
  return r.table('users').get(new_user.id).update(new_user).run()
    .then(() => new_user); // Pass through new_user
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

module.exports.auth_group_changes = function auth_group_changes(callback) {
  r.table('auth_groups').changes().run().then(
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
    .pluck(["id", "character_id", "character_name", "corporation_name", "alliance_name"]).run()
    .then((associations) => {
      if (associations && associations.length !== 0) {
        return associations;
      } else {
        return r.table('users').get(user_id)
          .pluck(["id", "character_id", "character_name", "corporation_name", "alliance_name"])
          .run().then((single_user) => [single_user]);
      }
    });
};

module.exports.update_affiliations = function update_affiliations(user_id) {
  return r.table('settings').insert(
    r.table('users').get(user_id).pluck(["corporation_id", "alliance_id"]).merge({
      id: "affiliations", group: "auth"})
  , {conflict: "update"}).run();
};

module.exports.has_group = function has_group(group) {
  return r.table('users').filter(r.row('auth_groups').contains(group)).pluck(["id", "character_name", "character_id"]).run();
};

module.exports.find_by_name = function find_user_by_name(name, all=false) {
  if (all) {
    return r.table('users').filter(r.row('character_name').match("(?i)" + name))
      .limit(5).run();
  } else {
    return r.table('users').filter(r.row('character_name').match("(?i)" + name)
      .and(r.row('main_user').default(r.row('id')).eq(r.row('id'))))
      .limit(5).run();
  }
};