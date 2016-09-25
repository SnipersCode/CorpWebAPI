const core_auth = require('../components/core/auth');
const session = require('../components/database/session');
const user_db = require('../components/database/user');
const auth_groups = require('../components/database/auth_groups');

const logs = require('../components/database/logs');
const core_errors = require('../components/core/errors');

const send_groups = function write_groups(client) {
  return auth_groups.get(null, true)
    .then((groups) => {
      client.write({
        module: "auth",
        endpoint: "groups.get",
        payload: groups
      })
    });
};

const send_users = function write_users(group, client) {
  return user_db.has_group(group)
    .then((users) => {
      client.write({
        module: "auth",
        endpoint: "groups.get_users",
        payload: users
      })
    });
};

const endpoint = function on_data(client, data) {
  if (data.endpoint.startsWith("groups.")) {
    core_auth.protect(client, ["edit_auth_groups"])
      .then(() => {
        switch (data.endpoint) {
          case "groups.create":
            logs.auth(client.user_id, client.name, "groups", "create", data.payload.id, data.payload)
              .then(() => auth_groups.create(data.payload))
              .then(() => send_groups(client))
              .catch(console.log);
            break;
          case "groups.remove":
            logs.auth(client.user_id, client.name, "groups", "remove", data.payload.id, data.payload)
              .then(() => auth_groups.remove(data.payload))
              .then(() => send_groups(client))
              .catch(console.log);
            break;
          case "groups.edit":
            logs.auth(client.user_id, client.name, "groups", "edit", data.payload.id, data.payload)
              .then(() => auth_groups.edit(data.payload))
              .then(() => send_groups(client))
              .catch(console.log);
            break;
          case "groups.add_user":
            logs.auth(client.user_id, client.name, "groups", "add_user", data.payload.user_id, data.payload)
              .then(() => user_db.add_groups(data.payload.user_id, data.payload.groups))
              .then(() => {
                for (const group of data.payload.groups) {
                  send_users(group, client)
                }
              });
            break;
          case "groups.remove_user":
            logs.auth(client.user_id, client.name, "groups", "remove_user", data.payload.user_id, data.payload)
              .then(() => user_db.remove_groups(data.payload.user_id, data.payload.groups))
              .then(() => {
                for (const group of data.payload.groups) {
                  send_users(group, client)
                }
              });
            break;
          case "groups.get":
            send_groups(client);
            break;
          case "groups.get_users":
            send_users(data.payload, client);
            break;
        }
      });
  } else {
    switch (data.endpoint) {
      case "user.associate":
        if (data.payload.main_user_id !== client.user_id) {
          core_auth.protect(client, ["edit_user"])
            .then(() => {
              user_db.associate(data.payload.user_id, data.payload.main_user_id);
            })
        } else {
          user_db.associate(client.payload.user_id, client.payload.main_user_id);
        }
        break;
      case "user.characters":
        if (data.payload !== client.user_id) {
          core_auth.protect(client, ["edit_user"])
            .then(() => {
              return user_db.associations(data.payload);
            })
            .then((characters) => client.write({
              module: "auth",
              endpoint: "user.characters",
              payload: characters
            }));
        } else {
          user_db.associations(data.payload)
            .then((characters) => client.write({
              module: "auth",
              endpoint: "user.characters",
              payload: characters
            }));
        }
        break;
      case "user.find":
        user_db.find_by_name(data.payload)
          .then((users) => client.write({
            module: "auth",
            endpoint: "user.find",
            payload: users
          }));
        break;
      case "logout":
        if (data.payload) {
          // Logout only given session
          session.invalidate(client.jti);
        } else {
          // Default logout all sessions
          session.invalidate_all(client.user_id);
        }
        break;
    }
  }
};

module.exports = function initialize(socket) {
  // Watch for session updates
  session.field_changes(["client_id", "user_id"],
    (err, change) => {
      const session = change.new_val;
      if (session) {
        const target_client = socket.spark(session.client_id);
        if (target_client) {
          core_auth.jwt_data(session.user_id, session.timestamp)
            .then((jwt_data) => {
              target_client.jwt_data = jwt_data;
              target_client.write({
                module: "auth",
                endpoint: "change.session",
                payload: session.id
              });
            });
        }
      }
    }
  );
  // Watch for session deletes
  session.changes(
    (err, change) => {
      if (!change.new_val && change.old_val.client_id) {
        const session = change.old_val;
        const target_client = socket.spark(session.client_id);
        if (target_client) {  // Check if client is still connected
          if (session.user_id) {  // Check if client was authenticated
            core_auth.jwt_data(session.user_id, session.timestamp)
              .then((jwt_data) => {
                target_client.jwt_data = jwt_data;
                target_client.end(core_errors.auth.session, {reconnect: true});
              });
          } else {
            target_client.end(core_errors.auth.session, {reconnect: true});
          }
        }
      }
    }
  );
  // Watch for auth group changes
  user_db.group_changes((err, change) => {
    // Might want to change this loop in the future if there are many clients
    socket.forEach((client, id, connections) => {
      if (change.new_val && change.new_val.id == client.user_id) {
        core_auth.jwt_data(client.user_id, new Date(client.jwt_data.iat * 1000))
          .then((jwt_data) => {
            client.jwt_data = jwt_data;
            client.write({
              module: "auth",
              endpoint: "change.auth_group",
              payload: change.new_val.auth_groups
            })
          });
      }
    })
  });
  // Watch for edits to site auth groups
  user_db.auth_group_changes((err, change) => {
    // Might want to change this loop in the future if there are many clients. Broadcast to all.
    socket.forEach((client, id, connections) => {
      // Recalculate permissions for all signed in users.
      if (client.user_id){
        core_auth.jwt_data(client.user_id, new Date(client.jwt_data.iat * 1000))
          .then((jwt_data) => {
            client.jwt_data = jwt_data;
            client.write({
              module: "auth",
              endpoint: "change.auth_group_root",
              payload: change.new_val
            });
          });
      }
    });
  });
  // Watch for association changes
  user_db.associate_changes((err, change) => {
    // Might want to change this loop in the future if there are many clients
    socket.forEach((client, id, connections) => {
      if (change.new_val && change.new_val.main_user == client.user_id &&
        change.new_val.main_user != change.new_val.id) {  // Do not include main
        core_auth.jwt_data(client.user_id, new Date(client.jwt_data.iat * 1000))
          .then((jwt_data) => {
            client.jwt_data = jwt_data;
            client.write({
              module: "auth",
              endpoint: "change.association",
              payload: change.new_val.character_name
            })
          });
      }
    })
  });


  return endpoint;
};
