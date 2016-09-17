config = require('../../config');

module.exports = require('rethinkdbdash')({
  db: "CorpWeb",
  servers: [{"host": config.db, "port": 28015}]
});