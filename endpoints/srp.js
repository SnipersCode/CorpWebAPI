const logs = require('../components/database/logs');
const core_auth = require('../components/core/auth');

const killmails = require('../components/database/killmails');
const prices = require('../components/database/prices');
const user_db = require('../components/database/user');
const eve = require('../components/database/eve');
const settings = require('../components/database/settings');

const srp_prices = function calculate_prices(losses, unfold=true) {
  let flat_losses = losses;
  if (unfold) {
    flat_losses = [].concat(...flat_losses);
  }
  return Promise.all(
    flat_losses.map((loss) => {
      // Prices are based on ship hull
      return prices.get(loss.ship_item_id)
        .then((pre_prices) => {
          if (pre_prices.length == 1) {
            return pre_prices[0].price;
          } else {
            return null;
          }
        })
        .then((price) => {
          // Adjust base srp price here
          loss.srp_base_price = price;
        })
        .then(() => eve.ships.get(loss.ship_item_id))
        .then((ship) => {
          if (!ship) {
            loss.ship_name = "N/A";
            loss.ship_group_id = -1;
            loss.ship_group_name = "N/A";
            loss.lower_ship_group_id = -1;
            loss.lower_ship_group_name = "N/A";
          } else {
            loss.ship_name = ship.name;
            loss.ship_group_id = ship.group_id;
            loss.ship_group_name = ship.group_name;
            loss.lower_ship_group_id = ship.lower_group_id;
            loss.lower_ship_group_name = ship.lower_group_name;
          }
          return Promise.resolve();
        })
        .then(() => eve.systems.get(loss.solar_system_id))
        .then((system) => {
          loss.solar_system_name = system.name;
          return loss;
        });
    })
  );
};

const multiplier = function multiplier(rules, ship_group_id) {
  rules = new Map(rules);
  let multiplier = rules.get(ship_group_id);
  if (!multiplier || !ship_group_id) { // No specific rule or no lower ship group
    multiplier = rules.get(null);
    if (!multiplier) {  // No default
      multiplier = 0;
    }
  }
  return multiplier;
};

const endpoint = function on_data(client, data) {
  core_auth.protect(client, ["corporation"]).then(() => {
    switch (data.endpoint) {
      case "lossmails.get":
        user_db.associations(client.user_id)
          .then((users) =>
            Promise.all(users.map((user) =>
              killmails.get(user.id, user.character_id, user.character_name)
            )))
          .then(srp_prices)
          .then((losses) => {
            console.log('writing losses');
            client.write({
              module: "srp",
              endpoint: "lossmails.get",
              payload: losses.filter((loss) => {
                return loss.ship_name != "N/A" && !loss.submitted;
              }) // Filter out non-ships and submitted killmails
            });
          })
          .catch(console.log);
        break;
      case "lossmails.all":
        killmails.all_submitted()
          .then((submitted) => {
            client.write({
              module: "srp",
              endpoint: "lossmails.all",
              payload: submitted || []
            });
          });
        break;
      case "lossmails.submit":
        const id_map = new Map(data.payload.map((loss) => [loss.id, loss]));
        killmails.id_get([...id_map.keys()])
          .then((killmails) => {
            return killmails.map((killmail) => {
              const edits = id_map.get(killmail.id);
              killmail.reimburse_to = edits.reimburse_to;
              killmail.aar = edits.aar;
              killmail.note = edits.note;
              killmail.srp_type = edits.srp_type;
              killmail.srp_submitter_id = client.user_id;
              killmail.srp_submitter_name = client.name;
              return killmail;
            });
          })
          .then((killmails) => killmails.filter((killmail) => !killmail.submitted))
          .then((killmails) => srp_prices(killmails, false))
          .then((killmails) => {
            return settings.srp_rules.get().then((all_rules) => {
              return killmails.map((killmail) => {
                killmail.srp_total = killmail.srp_base_price * multiplier(
                  all_rules[killmail.srp_type], killmail.lower_ship_group_id);
                return killmail;
              });
            });
          })
          .then(killmails.submit)
          .then(() => client.write({
            module: "srp",
            endpoint: "lossmails.submit",
            payload: true
          }));
        break;
      case "rules.get":
        settings.srp_rules.get().then((all_rules) => {
          client.write({
            module: "srp",
            endpoint: "change.rules",
            payload: all_rules || {standard: [[null, 0]]}
          });
        }).catch(console.log);
        break;
      case "lossmails.edit":
        core_auth.protect(client, ["srp_approve"]).then(() => {
          killmails.update(data.payload);
        });
        break;
    }
  });
};

module.exports = function initialize(socket) {
  // Changefeeds
  killmails.changes((err, change) => {
    socket.forEach((client, id, connections) => {
      if (client.permissions.get('corporation')) {
        client.write({
          module: "srp",
          endpoint: "change.lossmails",
          payload: [change.new_val]
        })
      }
    })
  });
  settings.srp_rules.changes((err, change) => {
    socket.forEach((client, id, connections) => {
      if (client.permissions.get('corporation')) {
        client.write({
          module: "srp",
          endpoint: "change.rules",
          payload: change.new_val
        })
      }
    })
  });

  return endpoint;
};
