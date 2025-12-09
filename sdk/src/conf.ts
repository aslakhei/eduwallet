import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { JsonRpcProvider, id } from "ethers";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env file if it exists
dotenv.config();

/**
 * Configuration for blockchain network connections.
 * Defines parameters needed to connect to Ethereum networks.
 */
interface BlockchainNetworkConfig {
    /** Chain identifier for the Ethereum network. */
    readonly chainId: string,
    /** JSON-RPC endpoint URL for the Ethereum network. */
    readonly url: string;
    /** Smart contract address for the StudentsRegister contract. */
    readonly registerAddress: string;
    /** Smart contract address for the EntryPoint contract used in the account abstraction protocol. */
    readonly entryPointAddress: string;
    /** Smart contract address for the Paymaster contract that sponsors transaction gas fees. */
    readonly paymasterAddress: string,
    /** Smart contract address for the StudentWallet factory that deploys new student wallets. */
    readonly studentFactoryAddress: string,
}

/**
 * Configuration for IPFS storage via S3-compatible service.
 * Defines parameters needed to store and retrieve certificates.
 */
interface IpfsStorageConfig {
    /** Gateway URL for retrieving IPFS content */
    gatewayUrl: string;
    /** AWS S3 client configuration. */
    s3Config: S3ClientConfig;
    /** S3 bucket name where certificates will be stored. */
    bucketName: string;
}

/**
 * Configuration for role identifiers in the access control system.
 * Defines the string identifiers for different permission levels.
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
 * Loads deployment addresses from deployments.json file if it exists.
 * Falls back to hardcoded values if the file doesn't exist.
 * @returns {BlockchainNetworkConfig} Configuration object with contract addresses
 */
function loadBlockchainConfig(): BlockchainNetworkConfig {
    // Default/fallback configuration
    const defaultConfig: BlockchainNetworkConfig = {
        chainId: "31337",
        url: "http://127.0.0.1:8545",
        registerAddress: "0x51a240271AB8AB9f9a21C82d9a85396b704E164d",
        entryPointAddress: "0xF2E246BB76DF876Cef8b38ae84130F4F55De395b",
        paymasterAddress: "0xB9816fC57977D5A786E654c7CF76767be63b966e",
        studentFactoryAddress: "0x2946259e0334f33a064106302415ad3391bed384",
    };

    // Try to load from deployments.json (created by CLI after deployment)
    const deploymentsPath = join(process.cwd(), 'deployments.json');
    if (existsSync(deploymentsPath)) {
        try {
            const deployments = JSON.parse(readFileSync(deploymentsPath, 'utf-8'));
            return {
                chainId: deployments.chainId || defaultConfig.chainId,
                url: deployments.url || defaultConfig.url,
                registerAddress: deployments.registerAddress || defaultConfig.registerAddress,
                entryPointAddress: deployments.entryPointAddress || defaultConfig.entryPointAddress,
                paymasterAddress: deployments.paymasterAddress || defaultConfig.paymasterAddress,
                studentFactoryAddress: deployments.studentFactoryAddress || defaultConfig.studentFactoryAddress,
            };
        } catch (error) {
            console.warn('Failed to load deployments.json, using default configuration:', error);
            return defaultConfig;
        }
    }

    return defaultConfig;
}

/**
 * Blockchain network configuration.
 * Automatically loads from deployments.json if available (created by CLI deployment),
 * otherwise uses hardcoded fallback values.
 */
export const blockchainConfig: BlockchainNetworkConfig = loadBlockchainConfig();

/**
 * IPFS storage configuration via S3-compatible service.
 * Credentials are loaded from environment variables for security.
 * 
 * Required environment variables:
 * - FILEBASE_BUCKET_NAME: The name of your Filebase bucket
 * - FILEBASE_ACCESS_KEY_ID: Your Filebase access key ID
 * - FILEBASE_SECRET_ACCESS_KEY: Your Filebase secret access key
 * 
 * Optional environment variables:
 * - FILEBASE_GATEWAY_URL: IPFS gateway URL (defaults to "https://ipfs.io/ipfs/")
 * - FILEBASE_ENDPOINT: S3 endpoint URL (defaults to "https://s3.filebase.com")
 */
export const ipfsConfig: IpfsStorageConfig = {
    /** IPFS gateway url. */
    gatewayUrl: process.env.FILEBASE_GATEWAY_URL || "https://ipfs.io/ipfs/",
    /** S3 bucket name. Loaded from environment variable. */
    bucketName: process.env.FILEBASE_BUCKET_NAME || "",
    /** S3 client configuration object. */
    s3Config: {
        /** S3 API version. */
        apiVersion: "2006-03-01",
        /** Authentication credentials. Loaded from environment variables. */
        credentials: {
            /** Access key ID. Loaded from FILEBASE_ACCESS_KEY_ID environment variable. */
            accessKeyId: process.env.FILEBASE_ACCESS_KEY_ID || "",
            /** Secret access key. Loaded from FILEBASE_SECRET_ACCESS_KEY environment variable. */
            secretAccessKey: process.env.FILEBASE_SECRET_ACCESS_KEY || "",
        },
        /** S3 endpoint URL. */
        endpoint: process.env.FILEBASE_ENDPOINT || "https://s3.filebase.com",
        /** AWS region. */
        region: "us-east-1",
        /** Use path-style addressing instead of virtual-hosted style. */
        forcePathStyle: true
    }
}

/**
 * Ethereum JSON-RPC provider instance.
 * Pre-configured with the URL from blockchain configuration.
 * Used to interact with the Ethereum blockchain network.
 */
export const provider = new JsonRpcProvider(blockchainConfig.url);

/**
 * S3 client for IPFS storage.
 * Pre-configured with the settings from IPFS configuration.
 * Used to store and retrieve certificate data on IPFS via S3 interface.
 */
export const s3Client = new S3Client(ipfsConfig.s3Config);

/**
 * Role identifiers used for access control.
 * Uses Ethereum's id() function to generate deterministic role identifiers from human-readable string constants.
 */
export const roleCodes: RoleCodes = {
    /** Role identifier for read access requesters */
    readRequest: id("READER_APPLICANT"),
    /** Role identifier for write access requesters */
    writeRequest: id("WRITER_APPLICANT"),
    /** Role identifier for approved readers */
    read: id("READER_ROLE"),
    /** Role identifier for approved writers */
    write: id("WRITER_ROLE"),
    /** Role identifier for employer read access requesters */
    employerReadRequest: id("EMPLOYER_READ_APPLICANT"),
    /** Role identifier for approved employer readers */
    employerRead: id("EMPLOYER_READ_ROLE"),
}

/**
 * Debug mode flag. When true, logs errors to the console.
 * Set to false in production to minimize console output.
 */
export const DEBUG = false;

/**
 * Conditionally logs errors to the console based on the DEBUG flag.
 * Provides consistent error logging throughout the application.
 * @param message - The error message to display
 * @param error - The actual error object containing details
 */
export function logError(message: string, error: any): void {
    if (DEBUG) {
        console.error(message, error);
    }
}
