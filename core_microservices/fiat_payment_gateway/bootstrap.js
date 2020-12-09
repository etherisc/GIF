require('dotenv').config({ path: `./env.${process.env.NODE_ENV}` });
const { bootstrap } = require('@etherisc/microservice');
const FiatPaymentGateway = require('./FiatPaymentGateway');


const requiredEnv = ['STRIPE_SECRET_KEY'];

bootstrap(FiatPaymentGateway, {
  db: true,
  amqp: true,
  requiredEnv,
});
