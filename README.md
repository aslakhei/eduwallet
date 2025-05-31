# EduWallet

## Table of Contents

- [EduWallet](#eduwallet)
  - [Table of Contents](#table-of-contents)
  - [🧭Overview](#overview)
  - [📁Project Structure](#project-structure)
    - [browser-extension](#browser-extension)
    - [cli](#cli)
    - [contracts](#contracts)
    - [sdk](#sdk)
    - [hardhat.config.ts](#hardhatconfigts)
  - [📦Installation and Setup Instructions](#installation-and-setup-instructions)

## 🧭Overview

EduWallet is a blockchain-based academic registry system that allows universities to issue and students to manage their academic records using Ethereum smart contracts and account abstraction technologies.

## 📁Project Structure

```bash
eduwallet/
├── browser-extension/
├── cli/
├── contracts/
├── sdk/
└── hardhat.config.ts
```

Each project folder contains a README that describes the corresponding component.

### browser-extension

Contains a React-based web application that serves as the student interface for the EduWallet system. It's structured as a modern Chrome extension application that provides students access to their academic records wallet.

### cli

Contains a command-line interface tool to test the `sdk`. It provides functionality for managing academic credentials, universities, and student records.

### contracts

Contains a set of Solidity smart contracts that form the blockchain foundation of the EduWallet system.

### sdk

Contains a TypeScript library that provides a streamlined API for interacting with the EduWallet system. It abstracts away the complexities of blockchain interactions and implements account abstraction for improved user experience.

### hardhat.config.ts

Configures the [Hardhat](https://hardhat.org/) development environment for the project. Hardhat is a development environment for Ethereum smart contract development, designed to help compile, deploy, test, and debug. Key aspects include:

- Solidity Compiler Settings:

  - Uses Solidity version `0.8.28`, the latest version fully supported by hardhat
  - Enables optimization with `1,000` runs to reduce bytecode size and keep contracts below the 24,576-byte limit.
  - Targets the `cancun` EVM version for latest Ethereum features

- Network Configurations:

  - hardhat: In-memory development network with one preset test account, used to deploy smart contracts and as system administrator
  - localhost: Connection to a local Ethereum node (<http://127.0.0.1:8545>)

## 📦Installation and Setup Instructions

✅**Prerequisites:**

- [Node.js](https://nodejs.org) installed on your system

🛠**Installation steps:**

1. Clone the repository.
2. Install dependencies in all component directories (`npm install` in the root, `sdk`, `cli` and `browser-extension` directories).
3. Compile the smart contracts by running `npx hardhat compile` in the root folder.
4. Build each component (`npm run build` in `sdk`, `cli` and `browser-extension` directories)

🛠**Browser extension installation:**

1. After building the extension, follow [this official guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world?hl=en#load-unpacked) to **Load an unpacked extension** in Chrome.

🚀**Run the system:**

1. Run `npx hardhat node` in the root folder to run a local Ethereum blockchain.
2. Run `npm run cli` in the root folder to run the CLI and deploy the initial contracts.
3. Use the CLI to register universities and students.
4. Manage students' academic wallets via the extension interface.
