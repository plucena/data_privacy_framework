require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      }
    }
  },
  paths: {
    sources: "./",
    artifacts: "./artifacts",
    cache: "./cache",
    tests: "./test"
  },
  allowUnlimitedContractSize: true,
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    }
  }
};
