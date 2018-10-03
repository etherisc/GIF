const WebSocket = require('ws');
const amqp = require('amqplib');


describe('Etherisc Flight Delay API', () => {
  it('should establish WebSocket connection', (done) => {
    const ws = new WebSocket('ws://localhost:8080/api/ws');

    ws.on('message', (message) => {
      const { msg } = JSON.parse(message);

      msg.should.be.equal('WebSocket connection successfully established');

      ws.close();
      done();
    });
  });

  it('sequence of messages after form apply should be correct', async () => {
    const ws = new WebSocket('ws://localhost:8080/api/ws');
    await new Promise(resolve => ws.on('open', resolve));

    const connection = await amqp.connect('amqp://localhost:5672');
    const channel = await connection.createChannel();

    await channel.assertExchange('POLICY', 'topic', { durable: true });

    const q = await channel.assertQueue('test_queue', { exclusive: false });
    await channel.bindQueue(q.queue, 'POLICY', '#');

    const messages = [];

    const form = {
      firstname: 'firstname',
      lastname: 'lastname',
      email: 'test@test.com',
      from: 'SFO',
      to: 'SRH',
      date: '2018-12-20',
    };

    await new Promise((resolve) => {
      channel.consume(q.queue, (message) => {
        const data = {
          routingKey: message.fields.routingKey,
          content: JSON.parse(message.content.toString()),
        };

        console.log(data); // eslint-disable-line
        messages.push(data);
      }, { noAck: true });

      ws.send(JSON.stringify({
        type: 'apply',
        data: form,
      }));

      setTimeout(() => {
        resolve();
      }, 20000);
    });

    await channel.close();
    await connection.close();
    ws.close();

    messages[0].routingKey.should.be.deepEqual('policy.create.v1');
    messages[0].content.should.be.deepEqual(form);

    messages[1].routingKey.should.be.equal('policy.creation_success.v1');

    const { policyId } = messages[1].content;

    messages.should.be.deepEqual([
      {
        routingKey: 'policy.create.v1',
        content: form,
      },
      {
        routingKey: 'policy.creation_success.v1',
        content: { policyId },
      },
      {
        routingKey: 'policy.transaction_created.v1',
        content: { policyId },
      },
      {
        routingKey: 'policy.state_changed.v1',
        content: { policyId, state: 0 },
      },
      {
        routingKey: 'policy.state_changed.v1',
        content: { policyId, state: 1 },
      },
      {
        routingKey: 'policy.charge_card.v1',
        content: { policyId },
      },
      {
        routingKey: 'policy.card_charged.v1',
        content: { policyId },
      },
      {
        routingKey: 'policy.issue_certificate.v1',
        content: { policyId },
      },
      {
        routingKey: 'policy.certificate_issued.v1',
        content: { policyId },
      },
      {
        routingKey: 'policy.state_changed.v1',
        content: { policyId, state: 3 },
      },
      {
        routingKey: 'policy.payout.v1',
        content: { policyId },
      },
      {
        routingKey: 'policy.paid_out.v1',
        content: { policyId },
      },
    ]);
  }).timeout(25000);
});