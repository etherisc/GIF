const { flags } = require('@oclif/command');
const BaseCommand = require('../../lib/BaseCommand');

/**
 * Create or replace artifact for products' contract
 */
class GetArtifact extends BaseCommand {
  /**
   * Run command
   * @return {Promise<void>}
   */
  async run() {
    const { flags: { product, networkName, contractName } } = this.parse(GetArtifact);
    const response = await this.api.getArtifact(product, networkName, contractName);

    if (response.error) {
      this.error(response.error);
    } else {
      response.abi = JSON.parse(JSON.parse(response.abi));
      this.log(JSON.stringify(response, null, 2));
    }
  }
}

GetArtifact.flags = {
  product: flags.string({ char: 'c', description: 'product [=platform for core contracts]', required: true }),
  networkName: flags.string({ char: 'c', description: 'network name', required: true }),
  contractName: flags.string({ char: 'c', description: 'contract name', required: true }),
};


GetArtifact.description = `Get artifact
...
Get artifact for contract
`;

module.exports = GetArtifact;
