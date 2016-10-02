// Import endpoints
const Auth = require("./auth");
const SRP = require('./srp');
const Eve_Statics = require('./eve_statics');

module.exports = function endpoints(socket) {
  // Initialize
  const auth = Auth(socket);
  const srp = SRP(socket);
  const eve_statics = Eve_Statics(socket);
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
        case "statics":
          eve_statics(client, data);
          break;
        case "test":
          console.log("running test");
          break;
      }
    });

  }).on('disconnection', (spark) => {
  });
};