const request = require('request');

const crest = require('./crest');
const eve = require('../database/eve');

module.exports.refresh = function refresh() {
  const links = Object.create(null);
  // Organize endpoints
  crest.endpoint("https://crest-tq.eveonline.com/")
    .then((data) => {
      // Root link parsing is not perfect
      const rootLinks = Object.keys(data).map((endpoint) => { return {id: endpoint, href: data[endpoint].href} });
      eve.meta.insert(rootLinks, null);
      // "Cached" responses used only for refresh
      return rootLinks.forEach((document) => {
        links[document.id] = document.href;
      });  // Wait for links to finish updating
    })
    // Refresh Ships
    .then(() => {
      // Get ship categories
      return crest.endpoint(links.marketGroups)
        .then((data) => {
          const ship_groups = [];
          const root_groups = new Map();
          data.items.forEach((group) => {
            if (group.parentGroup && group.parentGroup.id == 4) {
              root_groups.set(group.id, {
                "id": group.id,
                "name": group.name,
                "href": group.types.href
              });
            }
          });
          data.items.forEach((group) => {
            if (group.parentGroup && root_groups.get(group.parentGroup.id)){
              const root_group = root_groups.get(group.parentGroup.id);
              ship_groups.push({
                id: group.id,
                name: group.name,
                href: group.types.href,
                parent_id: root_group.id,
                parent_name: root_group.name,
                parent_href: root_group.href
              });
            }
          });
          eve.ship_groups.insert(ship_groups);
          return ship_groups
        })
    })
    .then((ship_groups) => {
      // Get ships
      ship_groups.forEach((ship_group) => {
        crest.endpoint(ship_group.href)
          .then((data) => {
            const ships = [];
            data.items.forEach((ship) => {
              ships.push({
                "id": ship.id,
                "name": ship.type.name,
                "group_id": ship_group.parent_id,
                "group_name": ship_group.parent_name,
                "lower_group_id": ship_group.id,
                "lower_group_name": ship_group.name,
                "icon": ship.type.icon.href,
                "href": ship.type.href
              })
            });
            eve.ships.insert(ships);
          })
      });
    })
    // Refresh Solar Systems
    .then(() => {
      return crest.endpoint(links.systems)
        .then((data) => {
          const systems = [];
          data.items.forEach((system) => {
            systems.push({
              id: system.id,
              name: system.name,
              href: system.href
            })
          });
          eve.systems.insert(systems);
        }).catch(console.log);
    });
};