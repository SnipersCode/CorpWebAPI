const logs = require('../components/database/logs');
const eve = require('../components/database/eve');

const endpoint = function on_data(client, data) {
  switch (data.endpoint) {
    case "ships.by_name":
      eve.ships.by_name(data.payload).then((ships) => {
        client.write({
          module: "statics",
          endpoint: "ships.by_name",
          payload: ships
        });
      });
      break;
    case "ships.get_all":
      if (data.payload){
        eve.ships.get_all(data.payload).then((ships) => {
          client.write({
            module: "statics",
            endpoint: "ships.get_all",
            payload: ships
          });
        });
      }
      break;
  }
};

module.exports = function initialize(socket) {
  // Changefeeds

  return endpoint;
};
