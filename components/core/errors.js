module.exports.auth = {
  session: {
    error: "auth.session",
    message: "Credentials were invalidated."
  },
  jwt: {
    error: "auth.jwt",
    message: "Supplied jwt key is invalid."
  },
  permissions: {
    error: "auth.permissions",
    message: "You do not have permission to use this function"
  },
  member: {
    error: "auth.member",
    message: "You must be a specific type of member to use this function."
  }
};