const r = require('./database');
const static_db = require('../eve_api/static');
const config = require('../../config');

const tables = new Map();
tables.set("auth_groups", ["priority"]);
tables.set("caches", ["parent"]);
tables.set("eve_killmails", ["submitter_id"]);
tables.set("eve_meta", []);
tables.set("eve_ship_groups", ["name", "parent_id", "parent_name"]);
tables.set("eve_ships", ["name", "group_id", "group_name", "lower_group_id", "lower_group_name"]);
tables.set("jwts", ["timestamp", "user_id"]);
tables.set("logs_main", ["timestamp"]);
tables.set("logs_auth", ["timestamp"]);
tables.set("prices", []);
tables.set("settings", []);
tables.set("users", ["main_user"]);
tables.set("srp", ["timestamp", "srp_user_id", "kill_time"]);
tables.set("eve_systems", ["name"]);
tables.set("security", []);

function flatten(deep_array) {
  return [].concat(...deep_array).filter((value) => { if(value) { return true; }});
}

// Only works for a clean installation.
module.exports = (callback) => {
  // Init Database
  r.dbCreate("CorpWeb").run()
    .catch((error) => {
      // Ignore ReqlOpFailedError
    })
    // Wait for database to be created
    .then(() => {
      return r.db("CorpWeb").wait().run();
    })
    // Create tables
    .then(() => {
      return Promise.all([...tables].map((table) => {
        return r.db("CorpWeb").tableCreate(table[0]).run().catch();
      }));
    })
    // Wait for tables to be created
    .then(() => {
      return Promise.all([...tables].map((table) => {
        return r.db("CorpWeb").wait(table[0]).run();
      }))
    })
    .catch((error) => {
      // Ignore ReqlOpFailedError
    })
    // Create indexes
    .then(() => {
      return Promise.all(flatten(
        [...tables].map((new_table) => {
          return new_table[1].map((index) => {
            return r.table(new_table[0]).indexCreate(index).run();
          });
        }))
      );
    })
    .catch((error) => {
      // Ignore ReqlOpFailedError
    })
    // Wait for indexes
    .then(() => {
      return Promise.all(flatten([...tables].map((new_table) => {
        if (new_table[1].length == 0){
          return null;
        } else {
          return r.table(new_table[0]).indexWait(...new_table[1]).run();
        }
      })));
    })
    .catch((error) => {
      // Ignore ReqlOpFailedError
    })
    .then(() => {
      // Static Refresh
      if (config.static_refresh) {
        console.log("Refreshing EVE Statics");
        static_db.refresh();
      } else {
        console.log("Skipping EVE Statics Refresh");
      }
    })
    .then(() => {
      // Settings init
      r.table("settings").insert({id: "srp_rules", group: "srp",
        standard: {groups: [[null, 0]], ships: [[null, 0]]}}).run();
    })
    .then(() => {
      callback();
    });
};