const axios = require('axios');
const ethers = require('ethers');
const cbor = require('cbor');
const multihashes = require('multihashes');


const gif = {};

gif.Instance = class Instance {
  /**
   * Returns an instance object.
   * @param {string} httpProvider
   * @param {string} registryAddress
   */
  constructor(httpProvider, registryAddress) {
    if (!registryAddress) throw new Error('Registry Address not provided, aborting... ');
    this.httpProvider = httpProvider;
    this.registryAddress = registryAddress;
    this.provider = new ethers.providers.JsonRpcProvider(httpProvider);
    this.contractConfigs = [];
    this.contracts = [];
    this.Registry = null;
  }

  static CBOR_PROCESSORS = [
    {
      origin: 'ipfs',
      process: multihashes.toB58String,
    },
    {
      origin: 'bzzr0',
      process: data => ethers.utils.hexlify(data)
        .slice(2),
    },
    {
      origin: 'bzzr1',
      process: data => ethers.utils.hexlify(data)
        .slice(2),
    },
  ];

  /**
   * Decodes cbor information at the end of a given code
   * @param {string} bytecode
   * @returns {{}}
   */
  cborDecode(bytecode) {
    const bytes = ethers.utils.arrayify(bytecode);
    const cborLength = bytes[bytes.length - 2] * 0x100 + bytes[bytes.length - 1];
    const bytecodeBuffer = Buffer.from(bytes.slice(bytes.length - 2 - cborLength, -2));
    const data = cbor.decodeFirstSync(bytecodeBuffer);
    for (let idx = 0; idx < Instance.CBOR_PROCESSORS.length; idx += 1) {
      const cborProcessor = Instance.CBOR_PROCESSORS[idx];
      const cborBytes = data[cborProcessor.origin];
      if (cborBytes) {
        const metadataId = cborProcessor.process(cborBytes);
        return { [cborProcessor.origin]: metadataId };
      }
    }
    throw new Error();
  }

  /**
   * Extracts the encoded ipfs information from code at a given address.
   * @param {string} addr
   * @returns {Promise<{}>}
   */
  async ipfsLink(addr) {
    const byteCode = await this.provider.getCode(addr);
    if (byteCode && byteCode !== '0x') {
      return this.cborDecode(byteCode);
    }
    throw new Error();
  }

  /**
   * Returns the abi for a given address, provided the code at the address
   * has encoded ipfs information and the abi is published on ipfs.
   * @param {string} addr
   * @returns {Promise<*[]|*>}
   */
  async getAbi(addr) {
    try {
      const regIPFS = await this.ipfsLink(addr);
      if (regIPFS && regIPFS.ipfs) {
        const gatewayLink = `https://gateway.pinata.cloud/ipfs/${regIPFS.ipfs}`;
        const { data: { output: { abi } } } = await axios.get(gatewayLink, { responseType: 'json' });
        return abi;
      }
    } catch (err) {
      throw new Error(`Could not find ipfs link at address ${addr}`);
    }
    throw new Error(`Could not find ipfs link at address ${addr}`);
  }

  /**
   * Converts the first 31 characters of a string in a bytes32 string.
   * @param {string} text
   * @returns {string}
   */
  s32b(text) {
    return ethers.utils.formatBytes32String(text.slice(0, 31));
  }

  /**
   * Returns the ethers.js Registry Contract object.
   * @returns {Promise<Contract>}
   */
  async getRegistry() {
    if (!this.Registry) {
      const registryAbi = await this.getAbi(this.registryAddress);
      const Registry = new ethers.Contract(
        this.registryAddress,
        registryAbi,
        this.provider,
      );
      const controller = Registry.controller();
      const augmentedRegistryAbi = await this.augmentAbi(registryAbi, controller);
      this.Registry = new ethers.Contract(
        this.registryAddress,
        augmentedRegistryAbi,
        this.provider,
      );
    }
    return this.Registry;
  }

  /**
   * In case of a storage contract, the abi is augmented with the controller functions.
   * @param {{}} contractAbi
   * @param {string} controllerAddress
   * @returns {Promise<*>}
   */
  async augmentAbi(contractAbi, controllerAddress) {
    if (controllerAddress !== '0x0000000000000000000000000000000000000000') {
      const controllerAbi = await this.getAbi(controllerAddress);
      controllerAbi.forEach((item) => {
        if (!contractAbi.some(it => it.name === item.name)) {
          contractAbi.push(item);
        }
      });
    }
    return contractAbi;
  }


  /**
   * Returns address an abi of a given GIF contract.
   * In case of a storage contract, the abi is augmented with the controller functions.
   * @param {string} contractName
   * @returns {Promise<void>}
   */
  async getContractConfig(contractName) {
    if (!this.contracts[contractName]) {
      const Registry = await this.getRegistry();
      const contractNameB32 = this.s32b(contractName);
      const contractAddress = await Registry.getContract(contractNameB32);
      let contractAbi = await this.getAbi(contractAddress);
      if (contractAbi.some(item => item.name === 'assignController')) {
        const controllerName = `${contractName}Controller`;
        const controllerNameB32 = this.s32b(controllerName);
        const controllerAddress = await Registry.getContract(controllerNameB32);
        contractAbi = await this.augmentAbi(contractAbi, controllerAddress);
      }
      this.contractConfigs[contractName] = {
        address: contractAddress,
        abi: contractAbi,
      };
    }
    return this.contractConfigs[contractName];
  }

  /**
   * Returns an ethers.js Contract Object.
   * @param {string} contractName
   * @returns {Promise<*>}
   */
  async getContract(contractName) {
    const config = await this.getContractConfig(contractName);
    this.contracts[contractName] = new ethers.Contract(config.address, config.abi, this.provider);
    return this.contracts[contractName];
  }

  /**
   * Returns address of ProductService Contract.
   * @returns {Promise<*>}
   */
  async getProductServiceAddress() {
    const { address } = await this.getContractConfig('ProductService');
    return address;
  }

  /**
   * Returns address of OracleService Contract.
   * @returns {Promise<*>}
   */
  async getOracleServiceAddress() {
    const { address } = await this.getContractConfig('OracleService');
    return address;
  }

  /**
   * Returns address of OracleOwnerService Contract.
   * @returns {Promise<*>}
   */
  async getOracleOwnerServiceAddress() {
    const { address } = await this.getContractConfig('OracleOwnerService');
    return address;
  }
};

module.exports = gif;
