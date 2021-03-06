require('dotenv').config();
const { fabric } = require('@etherisc/microservice');
const _ = require('lodash');
const PolicyStorage = require('../PolicyStorage');
const { constants: tables, schema } = require('../knexfile');


const requiredEnv = ['HTTP_PROVIDER', 'SALT', 'NETWORK_NAME',
  'POSTGRES_SERVICE_HOST', 'POSTGRES_SERVICE_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];

describe('PolicyStorage microservice', () => {
  before(async () => {
    this.microservice = fabric(PolicyStorage, {
      db: true,
      amqp: true,
      httpPort: 4000,
      appName: process.env.APP_NAME,
      appVersion: process.env.APP_VERSION,
      requiredEnv,
    });
    await this.microservice.bootstrap();

    this.amqp = this.microservice.amqp;
    this.db = this.microservice.db.getConnection();
    this.http = this.microservice.http;
  });

  beforeEach(async () => {
    await Promise.all(Object.keys(tables).map(key => this.db.raw(`truncate ${schema}.${tables[key]} cascade`)));
    await this.db(`${schema}.${tables.DISTRIBUTOR_TABLE}`).insert([
      {
        id: '11111111-1111-1111-1111-111111111111',
        company: 'Etherisc',
      },
    ]);
  });

  after(async () => {
    await Promise.all(Object.keys(tables).map(key => this.db.raw(`truncate ${schema}.${tables[key]} cascade`)));
    await this.microservice.shutdown();
  });

  it('onPolicyCreateMessage should create policy and new customer if it does not exists', async () => {
    const data = {
      customer: {
        firstname: 'firstname',
        lastname: 'lastname',
        email: 'email@email.com',
        gender: 'male',
      },
      policy: {
        distributorId: '11111111-1111-1111-1111-111111111111',
        vendorCode: '123',
        product: 'Macbook Pro',
        price: '1000',
        currency: 'usd',
      },
      payment: {
        kind: 'fiat',
        currency: 'usd',
        premium: 1500,
        provider: 'stripe',
        sourceId: '123',
      },
    };

    const fields = {
      routingKey: 'policy.policyCreationRequest.1.0',
    };

    const properties = {
      correlationId: '1',
    };

    await this.microservice.app.onPolicyCreateMessage({ content: data, fields, properties });

    const {
      Customer, Policy, CustomerExtra, PolicyExtra,
    } = this.microservice.app._models;

    // Check customer
    const customerId = this.microservice.app.generateCustomerId('firstname', 'lastname', 'email@email.com');
    const customer = await Customer.query();

    customer.length.should.be.equal(1);
    _.omit(customer[0], ['created', 'updated']).should.be.deepEqual({
      id: customerId,
      firstname: data.customer.firstname,
      lastname: data.customer.lastname,
      email: data.customer.email,
    });

    // Check customer extra
    const customerExtra = await CustomerExtra.query();

    customerExtra.length.should.be.equal(1);
    _.map(customerExtra, el => _.omit(el, ['created', 'updated', 'id'])).should.be.deepEqual([
      { field: 'gender', value: 'male', customerId },
    ]);

    // Check policy
    const policy = await Policy.query();

    policy.length.should.be.equal(1);
    _.omit(policy[0], ['created', 'updated', 'id', 'creationId']).should.be.deepEqual({
      customerId,
      distributorId: data.policy.distributorId,
    });

    // Check policy extra
    const policyExtra = await PolicyExtra.query();
    policyExtra.length.should.be.equal(4);

    const policyId = policy[0].id;

    _.map(policyExtra, el => _.omit(el, ['created', 'updated', 'id'])).should.be.deepEqual([
      { field: 'vendorCode', value: '123', policyId },
      { field: 'product', value: 'Macbook Pro', policyId },
      { field: 'price', value: '1000', policyId },
      { field: 'currency', value: 'usd', policyId },
    ]);
  });
});
