const request = require('../core/promises').request;

const config = require('../../config');

function marketstat_settings(item_ids) {
  return {
    method: 'GET',
    uri: "http://api.eve-central.com/api/marketstat/json?typeid=" + item_ids.join() + "&regionlimit=10000002",
    headers: {
      'User-Agent': config.eve_sso.user_agent,
      'Host': 'crest-tq.eveonline.com'
    },
    json: true
  }
}

module.exports.prices = function prices(item_ids){
  return request(marketstat_settings(item_ids))
    .then((body) => {
      const items = [];
      body.forEach((item) => {
        //noinspection JSUnresolvedVariable
        items.push({
          id: item.sell.forQuery.types[0],
          min_buy: item.buy.min,
          max_buy: item.buy.max,
          min_sell: item.sell.min,
          max_sell: item.sell.max
        })
      });
      return items;
    });
};