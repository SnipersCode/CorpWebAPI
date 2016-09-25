r = require('./database');

module.exports.get = function get(group_names, all=false) {
  if (all) {
    return r.table('auth_groups').run();
  }
  if (group_names){
    return r.table('auth_groups').getAll(...group_names).orderBy(r.desc('priority')).run();
  } else {
    return Promise.resolve([]);
  }
};

module.exports.create = function create(group) {
  return r.table('auth_groups').insert(group, {conflict: "replace"}).run();
};

module.exports.edit = function edit(group) {
  return r.table('auth_groups').update(group).run();
};

module.exports.remove = function remove(id) {
  // Remove group from all users
  return Promise.all([
    r.table('users').update({
      auth_groups: r.row('auth_groups').setDifference([id]).default([])
    }).run(),
    r.table('auth_groups').get(id).delete().run()
  ]);
};