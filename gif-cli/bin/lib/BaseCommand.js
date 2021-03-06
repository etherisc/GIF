require('dotenv').config();

const updateNotifier = require('update-notifier');
const { Command } = require('@oclif/command');
const { cli } = require('cli-ux');
const moment = require('moment');
const Amqp = require('@etherisc/amqp');
const chalk = require('chalk');
const Gif = require('./Gif');
const Api = require('./Api');
const GlobalConfig = require('./GlobalConfig');
const errorMessages = require('./errorMessages');


/**
 * Base command
 */
class BaseCommand extends Command {
  /**
   * Provides cli ux
   * @return {*}
   */
  get cli() {
    return cli;
  }

  /**
   *
   * @param{string} label
   * @param{string} msg
   */
  log(label, msg) {
    console.log(chalk` {green   > ${msg ? label : 'Info'}:} ${msg || label}`);
  }


  /**
   *
   * @param {error} error
   * @returns {Promise<void>}
   */
  async catch(error) {
    if (error instanceof Error) {
      console.log(chalk`{red    >> Error: } ${error.message}`);
      if (process.env.DEBUG) {
        console.log(error.stack);
      }
      throw (error);
    } else {
      console.log(chalk`{red    > Error: } ${error}`);
      throw (new Error(error));
    }
  }

  /**
   * Initialization
   * @return {Promise<void>}
   */
  async init() {
    // Check latest version
    const pkg = require(`${this.config.root}/package.json`);

    this.log(`gifcli v${pkg.version}`);

    updateNotifier({
      pkg,
      updateCheckInterval: 0,
    }).notify();

    const {
      GIF_API_HOST, GIF_API_PORT,
      GIF_AMQP_HOST, GIF_AMQP_PORT,
    } = process.env;

    // Initialize and configure API
    const host = GIF_API_HOST
      ? (GIF_API_HOST.startsWith('http://') || GIF_API_HOST.startsWith('https://')
        ? GIF_API_HOST
        : `http://${GIF_API_HOST}`)
      : 'https://api-sandbox.etherisc.com';
    const port = GIF_API_PORT
      ? `:${GIF_API_PORT}`
      : '';
    const apiUri = `${host}${port}`;
    this.log(`Connecting to GIF API: ${apiUri}`);
    this.api = new Api(apiUri);

    this.globalConfig = new GlobalConfig();

    if (this.globalConfig.token) {
      this.api.setAuthToken(this.globalConfig.token);
    }

    // Initialize and configure AMQP and Gif
    const { configuration } = this.globalConfig;
    if (configuration && configuration.current) {
      const { username, password } = this.globalConfig.credentials;
      this.log(`You're logged for product ${username}`);

      const config = {
        mode: 'product',
        username,
        password,
        host: GIF_AMQP_HOST || 'amqp-sandbox.etherisc.com',
        port: GIF_AMQP_PORT || 5673,
      };
      this.log(`Connecting to AMQP Host: ${config.host}${config.port ? `:${config.port}` : ''}`);
      const amqp = new Amqp(config, username, this.config.version);

      const info = {
        product: username,
      };
      this.gif = await new Gif(amqp, apiUri, info, this.catch);
    }

    this.moment = moment;

    this.errorMessages = errorMessages;
  }

  /**
   * Called after run and catch regardless of whether or not the command errored
   * @return {Promise<void>}
   */
  async finally() {
    if (this.gif && this.gif._connected) {
      await this.gif.shutdown();
      await new Promise(resolve => setTimeout(resolve, 1000));
      // force exit
    }
    process.exit(0);
  }
}

module.exports = BaseCommand;
