const logs = require('../components/database/logs');

const endpoint = function on_data(client, data) {
  switch (data.endpoint) {
    case "example":
      break;
  }
};

module.exports = function initialize(socket) {
  // Changefeeds

  return endpoint;
};
