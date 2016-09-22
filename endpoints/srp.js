const logs = require('../components/database/logs');
const core_auth = require('../components/core/auth');

const killmails = require('../components/database/killmails');
const prices = require('../components/database/prices');
const user_db = require('../components/database/user');
const eve = require('../components/database/eve');

const endpoint = function on_data(client, data) {
  core_auth.protect(client, ["alliance"]).then(() => {
    switch (data.endpoint) {
      case "lossmails.get":
        user_db.associations(client.user_id)
          .then((users) =>
            Promise.all(users.map((user) =>
              killmails.get(user.id, user.character_id, user.character_name)
            )))
          .then((losses) => {
            const flat_losses = [].concat(...losses);
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
            ).then((losses) => {
              // Write to srp then pass through losses
              return killmails.submit(losses).then(() => losses);
            });
          })
          .then((losses) => {
            client.write({
              module: "srp",
              endpoint: "lossmails.get",
              payload: losses
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
        killmails.submit(data.payload);
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

  return endpoint;
};
