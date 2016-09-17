const request = require('request');
const xmlParser = require('xml2js').parseString;
const fs = require('fs');

module.exports.request = function request_promise(settings) {
  return new Promise((fulfill, reject) => {
    request(settings,
      (error, response, body) => {
        if (error) {
          reject(error);
        } else if (body.error) {
          reject(body);
        } else {
          fulfill(body);  // Returns data
        }
      });
  });
};

module.exports.xmlParser = function xmlParser_promise(string){
  return new Promise((fulfill, reject) => {
    xmlParser(string, (err, parsed) => {
      if (err) {
        reject(err);
      } else if (parsed.eveapi.error) {
        reject(parsed.eveapi.error[0]);
      } else {
        fulfill(parsed);
      }
    })
  });
};

module.exports.fs = function fs_promise(path) {
  return new Promise((fulfill, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        reject(err);
      } else {
        fulfill(data);
      }
    });
  });
};