const r = require('./database');
const cache = require('./cache');

const config = require('../../config');

const eve_central = require('../eve_api/eve_central');

const set = function set(item_ids) {
  return r.table('settings').get('prices').default({
    id: 'prices',
    group: 'market',
    deviation: 0.1, // 10% by default
    timeout: 60 * 60 * 24 * 7 // In seconds, "about" (not exactly) one week by default
  }).run().then((setting) => {
    return eve_central.prices(item_ids)
      .then((items) => {
        const r_replace = (item) => {
          return r.table('prices').get(item.id).replace(r.branch(
            r.row.eq(null),
            // Insert if doesn't exist
            {id: item.id, price: item.price, timestamp: new Date()},
            // Otherwise update
            {
              id: item.id, price: r.branch(
              // Always write if data is stale
              r.now().sub(r.row('timestamp')).gt(setting.timeout), item.price,
              // Deviation rejection logic. New price cannot be greater/less than +/- deviation % original
              r.row('price').le(item.price / (1 + setting.deviation)), r.row('price'),
              r.row('price').ge(item.price / (1 - setting.deviation)), r.row('price'),
              // Else, write valid price
              item.price), timestamp: new Date()
            }
          ), {returnChanges: "always"}).run();
        };

        // This promise group may run many queries
        // Creating multiple queries means queries will be done in parallel
        // Doing the rejection logic database-side (r.branch) ensures atomic updates
        // Still not sure if parallel-atomic updates is even needed here though
        // If causes problems, should probably consider serial + non-atomic updates
        const item_actions = [];
        items.forEach((item) => {
          item_actions.push(r_replace({id: item.id, price: item.min_sell}));
          cache.update(item.id, new Date(Date.now() + config.api.prices_ttl * 1000) , 'prices')
        });
        if (item_actions.length != 0){
          return Promise.all(item_actions);
        } else {
          return Promise.resolve([]);
        }
      });
  });
};

module.exports.get = function get(item_ids) {
  // Returns array of items
  return cache.check(item_ids, 'prices')
    .then((cache_map) => {
      return set([...cache_map].filter((item) => !item[1]).map((item) => item[0]))  // Set items not cached
        .then((results) => {
          return Promise.resolve(results.map((result) => result.changes[0].new_val));  // Map results to new items
        })
        .then((new_items) => {
          // Get cached items
          return r.table('prices').getAll(...[...cache_map].filter((item) => item[1]).map((item) => item[0])).run()
            .then((old_items) => new_items.concat(old_items)); // Return new + cached items
        });
    })
};