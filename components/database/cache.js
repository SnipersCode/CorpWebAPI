const r = require('./database');

module.exports.check = function check(id, parent = null) {
  // Returns map of id to boolean value
  const results = new Map();
  if (parent) {
    if (Array.isArray(id)){
      const ids = new Map(id.map((key) => [parent + "-" + key, key]));  // Append parent
      return r.table('caches').getAll(...ids.keys()).run().then((caches) => {
        id.forEach((key) => results.set(key, false));  // Init
        caches.forEach((cache) => results.set(ids.get(cache.id), cache.timestamp && cache.timestamp > new Date()));
        return results;
      });
    } else {
      return r.table('caches').get(parent + "-" + id).run().then((cache) => {
        results.set(id, cache && cache.timestamp && cache.timestamp > new Date());
        return results;
      });
    }
  } else {
    if (Array.isArray(id)){
      return r.table('caches').getAll(...id).run().then((caches) => {
        id.forEach((key) => results.set(key, false));  // Init
        caches.forEach((cache) => results.set(cache.id, cache.timestamp && cache.timestamp > new Date()));
        return results;
      });
    } else {
      return r.table('caches').get(id).run().then((cache) => {
        results.set(id, cache && cache.timestamp && cache.timestamp > new Date());
        return results;
      });
    }
  }
};

module.exports.update = function update(id, ttl_date, parent = null) {

  let insertions = [];
  if (parent) {
    // Single document with multiple keys
    if (Array.isArray(id)) {
      id.forEach((key) => insertions.push({id: parent + "-" + key, timestamp: ttl_date, parent: parent}));
    } else {
      insertions.push({id: parent + '-' + id, timestamp: ttl_date, parent: parent});
    }
  } else {
    if (Array.isArray(id)) {
      id.forEach((key) => insertions.push({id: key, timestamp: ttl_date, parent: parent}));
    } else {
      insertions.push({id: id, timestamp: ttl_date, parent: parent});
    }
  }
  return r.table('caches').insert(insertions, {conflict: "replace"}).run();
};