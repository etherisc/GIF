const { knexfile } = require('@etherisc/microservice');


module.exports = {
  ...knexfile,
  migrations: {
    tableName: 'event_listener_migrations',
  },
};
