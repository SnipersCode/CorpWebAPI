// Import endpoints
const Auth = require("./auth");
const SRP = require('./srp');

module.exports = function endpoints(socket) {
  // Initialize
  const auth = Auth(socket);
  const srp = SRP(socket);
  //test.refresh();

  socket.on('connection', (client) => {
    client.on('data', (data) => {
      // Do routing
      switch (data.module) {
        case "auth":
          auth(client, data);
          break;
        case "srp":
          srp(client, data);
          break;
        case "test":
          console.log("running test");
          break;
      }
    });

  }).on('disconnection', (spark) => {
  });
};