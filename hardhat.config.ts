import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      evmVersion: "cancun"
    },
  },
  networks: {
    hardhat: {
      hardfork: "cancun",
      accounts: [
        {
          balance: "10000000000000000000000000000000",
          privateKey: "0x0000000000000000000000000000000000000000000000000000000000000001"
        }
      ]
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
