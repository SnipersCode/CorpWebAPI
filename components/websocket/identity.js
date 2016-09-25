const jwt = require('jsonwebtoken');
const session = require('../database/session');

const config = require('../../config');
const core_auth = require('../core/auth');
const core_errors = require('../core/errors');


module.exports = {
  server: (primus, settings) => {
    // Extend spark with initializations
    const Spark = primus.Spark;
    Spark.prototype.user_id = "";
    Spark.prototype.name = "";
    Spark.prototype.jti = "";
    Spark.prototype.jwt_data = {};
    Spark.prototype.permissions = new Map();

    // Validate data
    primus.transform('incoming', function (packet, next) {
      if (!packet.data.jwt) {
        this.jti = null;
        this.jwt_data = {id: null};
        next();
      } else {
        try {
          const token = jwt.verify(packet.data.jwt, config.sign_secret, {
            algorithms: ["HS256"],
            issuer: config.hostname
          });
          session.verify(token.jti, this.id)
            .then((session) => {
              if (!session) {
                this.end(core_errors.auth.session);
                next(null, false);
              } else {
                this.jti = session.id;
                this.user_id = session.user_id;
                this.name = session.name;
                this.character_id = session.character_id;
                if (session.user_id) {
                  core_auth.jwt_data(session.user_id, session.timestamp)
                    .then((jwt_data) => {
                      this.jwt_data = jwt_data;
                      this.permissions = new Map(jwt_data.permissions);
                      next();
                    });
                } else {
                  this.jwt_data = {id: null};
                  next();
                }
              }
            });
        } catch (e) {
          this.end(core_errors.auth.session);
          next(null, false);
        }
      }
    });

    primus.transform('outgoing', function (packet) {
      if (this.jti) {
        packet.data.jwt = jwt.sign(
          this.jwt_data,
          config.sign_secret,
          {
            expiresIn: config.max_session,
            audience: "CorpWeb:Main",
            issuer: config.hostname,
            subject: "CorpWeb:Auth",
            jwtid: this.jti
          }
        );
      }
    });

  }
};