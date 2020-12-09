require('dotenv').config({ path: `./env.${process.env.NODE_ENV}` });
const { bootstrap } = require('@etherisc/microservice');
const EventLogging = require('./EventLogging');


const requiredEnv = [];

bootstrap(EventLogging, {
  amqp: true,
  db: true,
  requiredEnv,
});
