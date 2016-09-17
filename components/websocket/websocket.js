const Primus = require('primus');


module.exports = function websocket(server, environment) {
  var primus = new Primus(server, {
    pathname: "/clients",
    transformer: "sockjs"
  });

  primus.plugin('identity', require("./identity"));

  /**
   * Export primus file during development
   */
  if (environment === 'development') {
    primus.save(__dirname + "/../../../CorpWeb/external_modules/primus/primus.js")
  }

  return primus
};