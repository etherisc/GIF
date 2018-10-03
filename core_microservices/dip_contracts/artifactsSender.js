const amqp = require('amqplib');
const fs = require('fs').promises;


const amqpBroker = process.env.MESSAGE_BROKER || 'amqp://localhost:5672';

(
  async () => {
    try {
      const version = process.env.npm_package_version;
      const network = process.env.NETWORK || 'development';
      const conn = await amqp.connect(amqpBroker);
      const ch = await conn.createChannel();
      await ch.assertExchange('POLICY', 'topic', { durable: true });
      const files = await fs.readdir('./build/contracts');
      const artifacts = await Promise.all(files.map(file => fs.readFile(`./build/contracts/${file}`, 'utf-8')));
      artifacts.forEach((artifact) => {
        ch.publish('POLICY', 'contract.deployed.v1', Buffer.from(JSON.stringify({ network, version, artifact })), {
          headers: {
            originatorName: process.env.npm_package_name,
            originatorVersion: process.env.npm_package_version,
          },
        });
      });
      console.log('Published content of build folder');
    } catch (e) {
      console.error(new Error(JSON.stringify({ message: e.message, stack: e.stack })));
      process.exit(1);
    }
  }
)();