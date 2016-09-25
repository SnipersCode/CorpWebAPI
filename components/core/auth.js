const user_db = require('../database/user');
const auth_groups = require('../database/auth_groups');
const core_errors = require('../core/errors');

const config = require('../../config');

function calculate_permissions(group_names) {
  return auth_groups.get(group_names)
    .then((groups) => {
      const list = new Map();
      // Last group is more important
      groups.forEach((group) => {
        Object.keys(group).forEach((permission) => {
          // Only literal false overrides. Other falsy values are ignored.
          // If one group has false on the permission, permission will stay false
          if (permission != "id" && permission != "priority") {
            if ((group[permission] === false || group[permission]) && (list.get(permission) !== false)) {
              list.set(permission, group[permission]);
            }
          }
        })
      });
      return list; // Returns Map of calculated permissions
    });
}

module.exports.calculate_permissions = calculate_permissions;

module.exports.jwt_data = function jwt_data(user_id, timestamp) {
  return user_db.get(user_id).then((user) => {
    return calculate_permissions(user.auth_groups)
      .then((permissions_map) => {
        const groups = new Set(user.auth_groups);

        // Affiliations
        if (user.corporation_id == config.affiliation.corporation_id) {
          permissions_map.set("corporation", true);
        }
        if (user.alliance_id == config.affiliation.alliance_id) {
          permissions_map.set("alliance", true);
        }
        if (user.character_id == config.affiliation.super_admin) {
          permissions_map.set("super_admin", true);
        }

        return {
          iat: Math.floor(timestamp.getTime() / 1000),
          user_id: user.id,
          character_id: user.character_id,
          character_name: user.character_name,
          character_owner_hash: user.character_owner_hash,
          corporation_id: user.corporation_id,
          corporation_name: user.corporation_name,
          alliance_id: user.alliance_id,
          alliance_name: user.alliance_name,
          auth_groups: [...groups],
          permissions: [...permissions_map]
        };
      });
  })
};

module.exports.user_permissions = function user_permissions(user_id) {
  return user_db.auth_groups(user_id).then(calculate_permissions);
};

module.exports.protect = function protect(client, permissions, error) {
  return new Promise((fulfill, reject) => {
    let valid = true;

    if (!client.permissions.get('super_admin')){ // Bypass check for super admins
      for (const permission of permissions) {
        if (!client.permissions.get(permission)) {
          client.end(core_errors.auth.permissions);
          valid = false;
          break;
        }
      }
    }

    if (valid) {
      fulfill();
    } else {
      reject(error);
    }
  });
};