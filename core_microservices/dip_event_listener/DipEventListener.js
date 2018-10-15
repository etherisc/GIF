const Web3 = require('web3');
const { Readable } = require('stream');


/**
 * DIP Event Listener microservice
 */
class DipEventListener {
  /**
   * Constructor
   * @param {object} amqp
   * @param {object} db
   * @param {object} log
   * @param {object} http
   * @param {object} config
   */
  constructor(
    {
      amqp, db, log, http, config,
    },
  ) {
    this.amqp = amqp;
    this.db = db;
    this.log = log;
    this.http = http;
    this.web3 = new Web3(config.rpcNode);
    this.networkName = config.networkName;
  }

  /**
   * Get past events
   * @param {buffer} buffer
   * @return {void}
   */
  async getPastEvents(buffer) {
    try {
      const addresses = JSON.parse(buffer.toString());
      /* eslint-disable-next-line no-restricted-syntax */
      for (const i of addresses) {
        const event = await this.db.raw('SELECT "blockNumber" + 1 AS "nextBlock" FROM dip_event_listener_events WHERE "networkName" = ? AND address IN (?) ORDER BY "blockNumber" DESC LIMIT 1', [this.networkName, i.address]);
        this.web3.eth.getPastLogs({ fromBlock: event.nextBlock, address: i.address })
          .then(events => events.forEach(this.handleEvent.bind(this)));
      }
    } catch (e) {
      this.log.error(new Error(JSON.stringify({ message: e.message, stack: e.stack })));
    }
  }

  /**
   * Handle event
   * @param {object} event
   * @return {void}
   */
  async onData(event) {
    try {
      this.fromBlock = event.blockNumber;
      const { rows } = await this.db.raw('SELECT EXISTS (SELECT 1 FROM dip_event_listener_contracts WHERE "networkName" = ? AND address = lower(?))', [this.networkName, event.address]);
      if (rows[0].exists) this.handleEvent(event);
    } catch (e) {
      this.log.error(new Error(JSON.stringify({ message: e.message, stack: e.stack })));
    }
  }

  /**
   * Handle error
   * @param {error} e
   * @return {void}
   */
  async onError(e) {
    const error = new Error(JSON.stringify({ message: e.message, stack: e.stack }));
    error.exit = true;
    this.log.error(error);
    throw error;
  }

  /**
   * Watch events realtime
   * @return {void}
   */
  async watchEventsRealtime() {
    try {
      this.web3.eth.subscribe('logs', { fromBlock: this.fromBlock })
        .on('data', this.onData.bind(this))
        .on('error', this.onError.bind(this));
    } catch (e) {
      this.log.error(new Error(JSON.stringify({ message: e.message, stack: e.stack })));
    }
  }

  /**
   * Handle event
   * @param {object} event
   * @return {void}
   */
  async handleEvent(event) {
    try {
      this.log.info({ event });
      const result = await this.db.raw('SELECT abi, version FROM dip_event_listener_contracts WHERE "networkName" = ? AND address = lower(?)', [this.networkName, event.address]);
      if (!result.rows[0]) return;
      const abi = result.rows[0].abi
        .filter(i => i.type === 'event')
        .map(i => Object.assign(i, { signature: this.web3.eth.abi.encodeEventSignature(i) }))
        .filter(i => i.signature === event.topics[0]);
      const decodedEvent = this.web3.eth.abi.decodeLog(abi[0].inputs, event.data, event.topics.slice(1));
      const block = await this.web3.eth.getBlock(event.blockNumber);
      const { rows } = await this.db.raw('INSERT INTO dip_event_listener_events (address, topics, data, "blockNumber", "timeStamp", "logIndex", "transactionHash", "transactionIndex", "eventName", "eventArgs", "networkName", version) VALUES (?, ?, ?, ?, to_timestamp(?), ?, ?, ?, ?, ?, ?, ?) ON CONFLICT ("networkName", "transactionHash", "logIndex") DO NOTHING RETURNING *', [
        event.address, JSON.stringify(event.topics), event.data, event.blockNumber, block.timestamp, event.logIndex,
        event.transactionHash, event.transactionIndex, abi[0].name, decodedEvent, this.networkName,
        result.rows[0].version,
      ]);
      if (!rows[0]) return;
      await this.amqp.publish('POLICY', 'event_listener.decoded_event.v1', rows[0], '');
    } catch (e) {
      this.log.error(new Error(JSON.stringify({ message: e.message, stack: e.stack })));
    }
  }

  /**
   * Send existing events
   * @return {void}
   */
  async sendExistingEvents() {
    try {
      // filter by network, version, address, fromBlock and any other fields including eventArgs
      const event = await this.db.raw('SELECT * FROM dip_event_listener_events', []);
      await this.amqp.publish('POLICY', 'event_listener.decoded_event.v1', event, '');
    } catch (e) {
      this.log.error(new Error(JSON.stringify({ message: e.message, stack: e.stack })));
    }
  }

  /**
   * Request artifacts
   * @param {object} message
   * @return {void}
   */
  async requestArtifacts(message) {
    try {
      const { version, list } = JSON.parse(message.content.toString());
      list.forEach((contract) => {
        this.amqp.publish('POLICY', 'contract.get_artifact.v1', { network: this.networkName, version, contract }, '');
      });
    } catch (e) {
      this.log.error(new Error(JSON.stringify({ message: e.message, stack: e.stack })));
    }
  }

  /**
   * Save artifact
   * @param {object} message
   * @return {void}
   */
  async saveArtifact(message) {
    try {
      const { version, artifact } = JSON.parse(message.content.toString());
      const artifactObject = JSON.parse(artifact);
      const networkId = Object.keys(artifactObject.networks)[0];
      const { address } = artifactObject.networks[networkId];
      const abi = JSON.stringify(artifactObject.abi);
      await this.db.raw('INSERT INTO dip_event_listener_contracts ("networkName", version, address, abi) VALUES (?, ?, ?, ?) ON CONFLICT ("networkName", address) DO UPDATE SET version = excluded.version, abi = excluded.abi', [this.networkName, version, address, abi]);
    } catch (e) {
      this.log.error(new Error(JSON.stringify({ message: e.message, stack: e.stack })));
    }
  }

  /**
   * Bootstrap and listen
   * @return {void}
   */
  async bootstrap() {
    try {
      this.fromBlock = await this.web3.eth.getBlockNumber();

      const contractsStream = new Readable({
        /**
         * Reading stream
         */
        read() {
          this.db.raw('SELECT address FROM dip_event_listener_contracts WHERE "networkName" = ? ORDER BY id LIMIT 100 OFFSET ?', [this.networkName, this.offset])
            .then((contracts) => {
              if (contracts.rows.length === 0) return this.push(null);
              this.push(JSON.stringify(contracts.rows));
              this.offset += 100;
              return true;
            });
        },
      });
      contractsStream.offset = 0;
      contractsStream.db = this.db;
      contractsStream.networkName = this.networkName;
      contractsStream.on('end', this.watchEventsRealtime.bind(this));
      contractsStream.on('data', this.getPastEvents.bind(this));

      await this.amqp.consume('POLICY', 'event_listener.get_existing_events.v1', this.sendExistingEvents.bind(this));

      await this.amqp.publish('POLICY', 'contract.get_artifact_list.v1', { network: this.networkName }, '');
      await this.amqp.consume('POLICY', 'contract.artifact_list.v1', this.requestArtifacts.bind(this));

      await this.amqp.consume('POLICY', 'contract.artifact.v1', this.saveArtifact.bind(this));

      await this.amqp.consume('POLICY', 'contract.deployed.v1', this.saveArtifact.bind(this));
    } catch (e) {
      const error = new Error(JSON.stringify({ message: e.message, stack: e.stack }));
      error.exit = true;
      this.log.error(error);
      throw error;
    }
  }
}

module.exports = DipEventListener;