import 'react-native-get-random-values';
import { id, JsonRpcProvider } from "ethers";
import { Platform } from "react-native";
import Constants from 'expo-constants';

/**
 * Configuration for blockchain network connections.
 * Defines parameters needed to connect to Ethereum networks.
 */
interface BlockchainNetworkConfig {
    /** Chain identifier for the Ethereum network. */
    readonly chainId: string;
    /** JSON-RPC endpoint URL for the Ethereum network. */
    readonly url: string;
    /** Smart contract address for the StudentsRegister contract. */
    readonly registerAddress: string;
    /** Smart contract address for the EntryPoint contract used in the account abstraction protocol. */
    readonly entryPointAddress: string;
    /** Smart contract address for the Paymaster contract that sponsors transaction gas fees. */
    readonly paymasterAddress: string;
    /** Smart contract address for the StudentWallet factory that deploys new student wallets. */
    readonly studentFactoryAddress: string;
}

/**
 * Configuration for IPFS storage.
 * Defines parameters needed to retrieve certificates.
 */
interface IpfsStorageConfig {
    /** Gateway URL for retrieving IPFS content */
    gatewayUrl: string;
}

/**
 * Configuration for role identifiers in the access control system.
 */
interface RoleCodes {
    /** Role identifier for users requesting read access */
    readRequest: string;
    /** Role identifier for users requesting write access */
    writeRequest: string;
    /** Role identifier for users with approved read access */
    read: string;
    /** Role identifier for users with approved write access */
    write: string;
    /** Role identifier for employers requesting read access */
    employerReadRequest: string;
    /** Role identifier for employers with approved read access */
    employerRead: string;
}

/**
 * Gets the RPC URL based on platform and environment variables.
 * On iOS/Android, uses the local IP address from environment variables.
 * On web, uses localhost.
 */
const getRpcUrl = (): string => {
    // Check for environment variable first (set via app.config.js)
    const rpcUrl = Constants.expoConfig?.extra?.rpcUrl;
    if (rpcUrl) {
        return rpcUrl;
    }
    
    // Platform-specific defaults
    if (Platform.OS === 'web') {
        return "http://127.0.0.1:8545";
    }
    
    // For iOS/Android, use local IP (user must set this in app.config.js)
    // Fallback to placeholder that will fail with clear error
    return "http://YOUR_LOCAL_IP:8545";
};

/**
 * Blockchain network configuration.
 */
export const blockchainConfig: BlockchainNetworkConfig = {
    chainId: "31337",
    url: getRpcUrl(),
    // NOTE: Update these addresses after each contract deployment
    // Get the addresses from cli/deployments.json or the CLI deployment output
    registerAddress: "0xB9816fC57977D5A786E654c7CF76767be63b966e", // Updated from CLI deployment
    entryPointAddress: "0xF2E246BB76DF876Cef8b38ae84130F4F55De395b",
    paymasterAddress: "0x6D411e0A54382eD43F02410Ce1c7a7c122afA6E1", // Updated from CLI deployment
    studentFactoryAddress: "0x2946259E0334f33A064106302415aD3391BeD384", // Updated from CLI deployment
};

/**
 * IPFS storage configuration.
 */
export const ipfsConfig: IpfsStorageConfig = {
    gatewayUrl: "https://ipfs.io/ipfs/",
};

/**
 * Ethereum JSON-RPC provider instance.
 */
export const provider = new JsonRpcProvider(blockchainConfig.url);

/**
 * Role identifiers used for access control.
 */
export const roleCodes: RoleCodes = {
    readRequest: id("READER_APPLICANT"),
    writeRequest: id("WRITER_APPLICANT"),
    read: id("READER_ROLE"),
    write: id("WRITER_ROLE"),
    employerReadRequest: id("EMPLOYER_READ_APPLICANT"),
    employerRead: id("EMPLOYER_READ_ROLE"),
};

/**
 * Debug mode flag.
 */
export const DEBUG = __DEV__ || true;

/**
 * Conditionally logs errors to the console based on the DEBUG flag.
 */
export function logError(message: string, error: any): void {
    if (DEBUG) {
        console.error(message, error);
    }
}

