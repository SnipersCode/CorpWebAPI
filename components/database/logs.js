r = require('./database');

module.exports.main = function logs_main(type, message) {
  return r.table('logs_main').insert({timestamp: new Date(), type: type, message: message}).run();
};

module.exports.auth = function logs_auth(user_id, name, type, event, target, data) {
  return r.table('logs_auth').insert({
    user_id: user_id,
    name: user_name,
    type: type,
    action: event,
    target: target,
    data: data
  }).run();
};