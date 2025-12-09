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
    - [package.json](#packagejson)
  - [📦Installation and Setup Instructions](#installation-and-setup-instructions)

## 🧭Overview

EduWallet is a blockchain-based academic registry system that allows universities to issue and students to manage their academic records using Ethereum smart contracts and account abstraction technologies.

## 📁Project Structure

```bash
eduwallet/
├── browser-extension/    # Chrome extension (web interface)
├── cli/                 # Command-line interface
├── contracts/           # Solidity smart contracts
├── eduwallet-mobile/    # React Native mobile app
├── sdk/                 # TypeScript SDK library
├── ...
├── hardhat.config.ts    # Hardhat configuration
└── package.json         # Root package.json
```

Each project folder contains a README that describes the corresponding component.

### [browser-extension](./browser-extension/)

Contains a React-based web application that serves as the student interface for the EduWallet system. It's structured as a modern Chrome extension application that provides students access to their academic records wallet.

### [cli](./cli/)

Contains a command-line interface tool to test the `sdk`. It provides functionality for managing academic credentials, universities, students, and employers. Use it to deploy contracts and register users.

### [contracts](./contracts/)

Contains a set of Solidity smart contracts that form the blockchain foundation of the EduWallet system. Includes Student, University, Employer, StudentsRegister, and account abstraction contracts.

### [eduwallet-mobile](./eduwallet-mobile/)

Contains a React Native mobile application built with Expo. Provides interfaces for both students and employers to manage academic records, permissions, and access requests.

### [sdk](./sdk/)

Contains a TypeScript library that provides a streamlined API for interacting with the EduWallet system. It abstracts away the complexities of blockchain interactions and implements account abstraction for improved user experience.

### [hardhat.config.ts](./hardhat.config.ts)

Configures the [Hardhat](https://hardhat.org/) development environment for the project. Hardhat is a development environment for Ethereum smart contract development, designed to help compile, deploy, test, and debug. Key aspects include:

- **Solidity Compiler Settings**:

  - Uses Solidity version `0.8.28`, the latest version fully supported by hardhat
  - Enables optimization with `1,000` runs to reduce bytecode size and keep contracts below the 24,576-byte limit.
  - Targets the `cancun` EVM version for latest Ethereum features

- **Network Configurations**:

  - hardhat: In-memory development network with one preset test account, used to deploy smart contracts and as system administrator
  - localhost: Connection to a local Ethereum node (<http://127.0.0.1:8545>)

### [package.json](./package.json)

**Key Scripts**:

- `build`: Compiles smart contracts and builds all components.
- `dependencies`: Installs dependencies across all project components.
- `build-sdk`: Builds the SDK component.
- `build-cli`: Builds the CLI component.
- `cli`: Runs the CLI via Hardhat on a local network.

## 📦Installation and Setup Instructions

✅**Prerequisites:**

- [Node.js](https://nodejs.org) (v18 or higher) installed on your system
- [Chrome](https://www.google.it/intl/it/chrome) browser installed on your system (for browser extension)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (for mobile app development)
- [Filebase](https://filebase.com) account to use the pinning system. After creating the account, you must generate a new bucket 
in the window shown in the figure below, with a name that is unique (do not use `eduwallet`, since it is already taken).

🛠**Installation steps:**

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd eduwallet
   ```

2. Install dependencies in all component directories:
   ```bash
   npm run dependencies
   ```
   This installs dependencies for the root project, SDK, CLI, browser extension, and mobile app.

3. Configure Filebase for IPFS:
   - Create a [Filebase](https://filebase.com) account
   - Generate a new bucket with a unique name
   - Copy `sdk/.env.example` to `sdk/.env`
   - Fill in your Filebase credentials in `sdk/.env`:
     ```
     FILEBASE_BUCKET_NAME=your-bucket-name
     FILEBASE_ACCESS_KEY_ID=your-access-key-id
     FILEBASE_SECRET_ACCESS_KEY=your-secret-access-key
     ```
   - **Important:** Never commit the `.env` file to version control

4. Compile smart contracts and build all components:
   ```bash
   npm run build
   ```
   This compiles the smart contracts, builds the SDK, CLI, and browser extension.

## 🚀Running the System

### Step 1: Start Local Blockchain

In the project root, start a local Hardhat node:

```bash
npx hardhat node
```

This starts a local Ethereum blockchain at `http://localhost:8545`. Keep this terminal window open.

**Note:** For network access (e.g., mobile devices on the same network), you can use:
```bash
npx hardhat node --hostname 0.0.0.0
```

### Step 2: Deploy Contracts

In a **new terminal window**, deploy the contracts using the CLI:

```bash
npm run cli
```

This will:
- Deploy all smart contracts (StudentsRegister, EntryPoint, Paymaster, etc.)
- Create a `deployments.json` file in the project root with contract addresses
- The SDK will automatically read from `deployments.json` if available

**Important:** After deployment, note the contract addresses from the output or check `deployments.json`.

### Step 3: Configure Mobile App (if using mobile app)

After deploying contracts, update the mobile app configuration:

1. Open `eduwallet-mobile/src/services/config.ts`
2. Update the contract addresses with values from `cli/deployments.json`:
   ```typescript
   export const blockchainConfig: BlockchainNetworkConfig = {
       chainId: "31337",
       url: getRpcUrl(),
       registerAddress: "0x...", // From deployments.json
       entryPointAddress: "0x...", // From deployments.json
       paymasterAddress: "0x...", // From deployments.json
       studentFactoryAddress: "0x...", // From deployments.json
   };
   ```

3. For local network access, ensure `getRpcUrl()` returns the correct URL:
   - Localhost: `http://localhost:8545`
   - Network access: `http://<your-ip>:8545` (replace `<your-ip>` with your machine's IP address)

### Step 4: Create Users

Use the CLI to create universities, students, and employers:

```bash
npm run cli
```

Then follow the CLI prompts to:
- Register a university
- Register a student (requires university)
- Register an employer

**Save the credentials** (student ID/password, employer private key) - you'll need them to log in!

### Step 5: Run the Mobile App

Navigate to the mobile app directory:

```bash
cd eduwallet-mobile
```

Start the Expo development server:

```bash
npm start
# or
npx expo start
```

Then choose your platform:
- **Web**: Press `w` or visit the URL shown
- **Android**: Press `a` (requires Android emulator or device)
- **iOS**: Press `i` (requires iOS simulator or device)

**For web development:**
```bash
npm run web
# or
npx expo start --web
```

### Step 6: Run the Browser Extension (Optional)

1. Build the extension (if not already built):
   ```bash
   cd browser-extension
   npm run build
   ```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `browser-extension/dist` folder

## Mobile App Usage

### Login

1. **Student Login:**
   - Use the student ID and password from CLI registration
   - Toggle to "Login as Student" if needed

2. **Employer Login:**
   - Use the private key from CLI registration
   - Toggle to "Login as Employer"

### Features

**For Students:**
- View academic records and courses
- Manage permissions (grant/revoke access to universities and employers)
- View certificates

**For Employers:**
- Request access to student records
- View students who have granted access
- View detailed academic records of approved students

## 🔧Troubleshooting

### Mobile app can't connect to blockchain

- Ensure Hardhat node is running
- Check that contract addresses in `config.ts` match `deployments.json`
- For network access, use `--hostname 0.0.0.0` when starting Hardhat
- Verify the RPC URL is correct for your setup

### "Student/Employer not registered" error

- Ensure you've created the user using the CLI first
- Check that you're using the correct credentials
- Verify the contract addresses are correct

### Contract addresses change after redeployment

- Update `eduwallet-mobile/src/services/config.ts` with new addresses
- Or copy `cli/deployments.json` to project root (SDK will auto-read it)

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/): Learn about Expo and React Native development
- [Hardhat Documentation](https://hardhat.org/docs): Learn about Hardhat and smart contract development
- [Ethers.js Documentation](https://docs.ethers.org/): Learn about Ethereum interactions
