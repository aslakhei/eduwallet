import type { Student as StudentInterface, University as UniversityInterface, AcademicResult, StudentEthWalletInfo } from "./types";
import { blockchainConfig, DEBUG, ipfsConfig, logError, provider, s3Client } from "./conf";
import type { StudentsRegister } from '@typechain/contracts/StudentsRegister';
import { StudentsRegister__factory } from "@typechain/factories/contracts/StudentsRegister__factory"
import type { Student } from '@typechain/contracts/Student';
import { Student__factory } from '@typechain/factories/contracts/Student__factory';
import { University__factory } from '@typechain/factories/contracts/University__factory';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'fs';
import { Wallet } from 'ethers';
import type { BaseContract, Result } from 'ethers';
import { EntryPoint__factory } from '@typechain/factories/@account-abstraction/contracts/core/EntryPoint__factory';
import type { EntryPoint } from '@typechain/@account-abstraction/contracts/core/EntryPoint';
import type { University } from '@typechain/contracts/University';
import { AccountAbstraction } from "./AccountAbstraction";


/**
 * Creates a new wallet for a student with random credentials.
 * Generates a random ID and password, then derives a private key for blockchain interaction.
 * @author Diego Da Giau
 * @returns {StudentEthWalletInfo} Object containing student ID, password and Ethereum wallet
 */
export function createStudentWallet(): StudentEthWalletInfo {
    try {
        const studentId = generateRandomString(10);
        const randomString = generateRandomString(16);
        const privateKey = derivePrivateKey(randomString, studentId);
        const wallet = new Wallet(privateKey);
        return {
            password: randomString,
            id: studentId,
            ethWallet: wallet
        };
    } catch (error) {
        logError('Failed to create student wallet:', error);
        throw new Error('Failed to create student wallet: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Generates a cryptographically secure random string of specified length.
 * Used for creating student credentials.
 * @author Diego Da Giau
 * @param {number} length - Desired length of the random string
 * @returns {string} Hexadecimal random string
 */
function generateRandomString(length: number): string {
    try {
        return randomBytes(length).toString('hex');
    } catch (error) {
        logError('Failed to generate random string:', error);
        throw new Error('Failed to generate secure random string: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Derives a private key from a password and student ID using PBKDF2.
 * Creates a deterministic key that can be reconstructed with the same inputs.
 * @author Diego Da Giau
 * @param {string} password - User password for key derivation
 * @param {string} studentId - Student ID used as salt
 * @returns {string} Ethereum-compatible private key with 0x prefix
 */
function derivePrivateKey(password: string, studentId: string): string {
    try {
        const iterations = 100000;
        const keyLength = 32;
        const derivedKey = pbkdf2Sync(password, studentId, iterations, keyLength, 'sha256').toString('hex');
        return '0x' + derivedKey;
    } catch (error) {
        logError('Failed to derive private key:', error);
        throw new Error('Failed to derive private key: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Retrieves the EntryPoint contract instance.
 * The EntryPoint is the central contract in ERC-4337 that manages account abstraction.
 * @author Diego Da Giau
 * @returns {EntryPoint} Connected EntryPoint contract instance
 * @throws {Error} If connection to the contract fails
 */
export function getEntryPoint(): EntryPoint {
    try {
        return EntryPoint__factory.connect(blockchainConfig.entryPointAddress, provider);
    } catch (error) {
        logError('Failed to get EntryPoint contract:', error);
        throw new Error('Failed to connect to EntryPoint contract: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Gets the smart account address associated with a university's EOA wallet.
 * Retrieves the university's smart contract account address from the registry.
 * @author Diego Da Giau
 * @param {Wallet} universityEthWallet - University's Ethereum wallet
 * @returns {Promise<string>} University's smart account contract address
 * @throws {Error} If retrieval of the smart account address fails
 */
export async function getUniversityAccountAddress(universityEthWallet: Wallet): Promise<string> {
    try {
        const studentsRegister = getStudentsRegister();
        const universityAccountAddress = await studentsRegister.connect(universityEthWallet).getUniversityAccount();
        return universityAccountAddress;
    } catch (error) {
        logError('Failed to get University smart account address:', error);
        throw new Error('Failed to retrieve University smart account address: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Retrieves the StudentsRegister contract instance.
 * Central registry that manages student and university registrations.
 * @author Diego Da Giau
 * @returns {StudentsRegister} Connected contract instance
 */
export function getStudentsRegister(): StudentsRegister {
    try {
        return StudentsRegister__factory.connect(blockchainConfig.registerAddress, provider);
    } catch (error) {
        logError('Failed to get StudentsRegister contract:', error);
        throw new Error('Failed to connect to StudentsRegister contract: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Gets a connected instance of a Student contract for interaction.
 * Used to interact with a specific student's academic record.
 * @author Diego Da Giau
 * @param {string} contractAddress - Student contract address
 * @returns {Student} Connected student contract instance
 */
export function getStudentContract(contractAddress: string): Student {
    try {
        return Student__factory.connect(contractAddress, provider);
    } catch (error) {
        logError('Failed to get Student contract:', error);
        throw new Error('Failed to connect to Student contract: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Gets a connected instance of a University contract for interaction.
 * Used to interact with a university's smart account.
 * @author Diego Da Giau
 * @param {string} contractAddress - University smart account address
 * @returns {University} Connected university contract instance
 * @throws {Error} If connection to the contract fails
 */
export function getUniversitySmartAccount(contractAddress: string): University {
    try {
        return University__factory.connect(contractAddress, provider);
    } catch (error) {
        logError('Failed to get University contract:', error);
        throw new Error('Failed to connect to University contract: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Converts a blockchain timestamp to a human-readable ISO date string.
 * Handles the conversion from Unix epoch seconds to JavaScript milliseconds.
 * @author Diego Da Giau
 * @param {bigint} date - Unix timestamp as BigInt
 * @returns {string} Date formatted as 'YYYY-MM-DD'
 */
export function computeDate(date: bigint): string {
    dayjs.extend(utc);
    return dayjs.utc(Number(date) * 1000).format('YYYY-MM-DD');
}

/**
 * Uploads a certificate to IPFS via S3 compatible storage.
 * Handles both file paths and direct buffer uploads.
 * @author Diego Da Giau
 * @param {Buffer | string} certificate - Certificate as a Buffer or file path
 * @returns {Promise<string>} The IPFS content identifier (CID)
 */
export async function publishCertificate(certificate: Buffer | string): Promise<string> {
    try {
        // Convert file path to buffer if string was provided
        let bufferFile: Buffer;
        if (typeof certificate === "string") {
            bufferFile = readFileSync(certificate);
        } else {
            bufferFile = certificate;
        }

        // Prepare upload parameters
        const uploadParams = {
            Bucket: ipfsConfig.bucketName,
            Key: `${dayjs().valueOf()}`,
            Body: bufferFile,
            ContentType: "application/pdf",
        };

        // Create command for S3 upload
        const command = new PutObjectCommand(uploadParams);
        let cid = "";

        // Add middleware to extract CID from response headers
        command.middlewareStack.add(
            (next) => async (args) => {
                try {
                    const response = await next(args);
                    if (!response.response || typeof response.response !== 'object') return response;
                    const apiResponse = response.response as {
                        statusCode?: number;
                        headers?: Record<string, string>
                    };
                    if (apiResponse.headers && "x-amz-meta-cid" in apiResponse.headers) {
                        cid = apiResponse.headers["x-amz-meta-cid"];
                    }
                    return response;
                } catch (error) {
                    logError('Middleware error:', error);
                    throw error;
                }
            }, {
            step: "build",
            name: "addCidToOutput",
        });

        // Execute upload
        await s3Client.send(command);

        if (!cid) {
            throw new Error('Failed to get CID from upload response');
        }

        return cid;
    } catch (error) {
        if (error instanceof Error && error.message.includes('ENOENT')) {
            throw new Error(`Certificate file not found: ${certificate}`);
        }
        logError('Failed to publish certificate:', error);
        throw new Error('Failed to publish certificate: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Generates a complete student object with academic results.
 * Fetches university information for each result and formats data.
 * @author Diego Da Giau
 * @param {StudentInterface} student - Basic student information from blockchain contract
 * @param {Student.ResultStructOutput[]} results - Array of raw result data from contract
 * @returns {Promise<StudentInterface>} Complete student object with formatted results
 * @throws {Error} If a university cannot be found for a result
 */
export async function generateStudent(student: StudentInterface, results: Student.ResultStructOutput[]): Promise<StudentInterface> {
    try {
        // Get universities information for all results
        const universities = await getUniversities(new Set(results.map(r => r.university)));

        // Process each result with its university information
        const resultsDef = results.map(r => {
            const university = universities.get(r.university);
            if (!university) {
                throw new Error(`University not found for address: ${r.university}`);
            }
            return generateResult(r, university);
        });

        // Return complete student object
        return {
            ...student,
            results: resultsDef,
        };
    } catch (error) {
        logError('Failed to generate student data:', error);
        throw new Error('Failed to generate student data: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Formats a raw academic result from the blockchain into a human-readable format.
 * Converts numerical values, dates, and adds readable URLs for certificates.
 * @author Diego Da Giau
 * @param {Student.ResultStructOutput} result - Raw result data from contract
 * @param {University} university - University information for this result
 * @returns {AcademicResult} Formatted academic result
 */
function generateResult(result: Student.ResultStructOutput, university: UniversityInterface): AcademicResult {
    try {
        return {
            name: result.name,
            code: result.code,
            university,
            degreeCourse: result.degreeCourse,
            ects: Number(result.ects) / 100,  // Convert ECTS from stored integer (x100) to decimal
            grade: result.grade || undefined, // Use undefined for empty grades
            evaluationDate: result.date ? computeDate(result.date) : undefined,
            certificate: result.certificateHash ? `${ipfsConfig.gatewayUrl}${result.certificateHash}` : undefined,
        };
    } catch (error) {
        logError('Failed to generate result:', error);
        throw new Error('Failed to generate academic result: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Retrieves information about multiple universities by their blockchain addresses.
 * Maps university addresses to their detailed information.
 * @author Diego Da Giau
 * @param {Set<string>} universitiesAddresses - Set of university blockchain addresses
 * @returns {Promise<Map<string, University>>} Map of university addresses to university details
 */
async function getUniversities(universitiesAddresses: Set<string>): Promise<Map<string, UniversityInterface>> {
    if (universitiesAddresses.size === 0) {
        return new Map<string, UniversityInterface>();
    }

    try {
        // Create a map to store university details by address
        const universitiesPromises = new Map<string, Promise<UniversityInterface>>();

        for (let address of universitiesAddresses) {
            try {
                universitiesPromises.set(
                    address,
                    getUniversity(address)
                );
            } catch (uniError: any) {
                logError(`Failed to get university data for ${address}:`, uniError);
                // Continue with other universities instead of failing completely
            }
        }

        // Resolve all promises in parallel and create the result map
        const results = await Promise.allSettled([...universitiesPromises.entries()].map(
            async ([address, promise]) => {
                try {
                    const university = await promise;
                    return [address, university];
                } catch (promError: any) {
                    logError(`Failed to get university data for ${address}:`, promError);
                    return null;
                }
            }
        ));

        // Process results and create the universities map
        const universities = new Map<string, UniversityInterface>();

        results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .forEach(result => {
                const [address, university] = (result as PromiseFulfilledResult<[string, UniversityInterface]>).value;
                universities.set(address, university);
            });

        return universities;
    } catch (error) {
        logError('Failed to get universities:', error);
        throw new Error('Failed to retrieve university information: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Retrieves detailed information about a specific university.
 * Connects to the university's smart contract and fetches its public information.
 * @author Diego Da Giau
 * @param {string} universityAccountAddress - University smart contract address
 * @returns {Promise<UniversityInterface>} University details including name and location
 * @throws {Error} If university information cannot be retrieved
 */
async function getUniversity(universityAccountAddress: string): Promise<UniversityInterface> {
    try {
        // Connect to university contract
        const contract = University__factory.connect(universityAccountAddress, provider);

        // Fetch university information
        const {
            name,
            country,
            shortName
        } = await contract.getUniversityInfo();

        // Return formatted university object
        return {
            name,
            country,
            shortName,
        };
    } catch (error) {
        logError(`Failed to get university at address ${universityAccountAddress}:`, error);
        throw new Error('Failed to retrieve university details: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Sends a transaction through a university's smart account using account abstraction.
 * Creates and executes a user operation that calls a specific function on a target contract.
 * @author Diego Da Giau
 * @param {Wallet} universityEthWallet - University's Ethereum wallet (EOA)
 * @param {BaseContract} targetContract - Contract instance to interact with
 * @param {string} targetContractAddress - Address of the target contract
 * @param {string} functionName - Name of the function to call
 * @param {any[]} params - Parameters to pass to the function
 * @returns {Promise<void>}
 * @throws {Error} If transaction execution fails
 */
export async function sendTransaction(universityEthWallet: Wallet, targetContract: BaseContract, targetContractAddress: string, functionName: string, params: any[]): Promise<void> {
    try {
        const connectedUniversity = universityEthWallet.connect(provider);

        const smartAccountAddress = await getUniversityAccountAddress(connectedUniversity);

        // Initialize account abstraction manager
        const accountAbstraction = new AccountAbstraction(
            provider,
            universityEthWallet
        );

        // Create contract interface for test contract
        const targetContractInterface = targetContract.interface;

        const callData = targetContractInterface.encodeFunctionData(functionName, params);

        // Create user operation
        const userOp = await accountAbstraction.createUserOp({
            sender: smartAccountAddress,
            target: targetContractAddress,
            value: 0n,
            data: callData,
        });

        // Execute the operation
        const tx = await accountAbstraction.executeUserOps([userOp], connectedUniversity.address);
        const receipt = await tx.wait();
        if (receipt) {
            accountAbstraction.verifyTransaction(receipt, targetContract);
        }
    } catch (error) {
        logError(`Failed to transaction ${functionName}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Executes a view (read-only) function call through a university's smart account.
 * This allows read operations that respect access control rules in the smart contracts.
 * @author Diego Da Giau
 * @param {Wallet} universityEthWallet - University's Ethereum wallet (EOA)
 * @param {BaseContract} targetContract - Contract instance to interact with
 * @param {string} targetContractAddress - Address of the target contract
 * @param {string} functionName - Name of the view function to call
 * @param {any[]} params - Parameters to pass to the function
 * @returns {Promise<Result>} Decoded results from the function call
 * @throws {Error} If the view call fails
 */
export async function executeSmartAccountViewCall(universityEthWallet: Wallet, targetContract: BaseContract, targetContractAddress: string, functionName: string, params: any[]): Promise<Result> {
    try {
        const connectedUniversity = universityEthWallet.connect(provider);

        // Create a contract instance for the smart account
        const smartAccountAddress = await getUniversityAccountAddress(connectedUniversity);
        const smartAccount = getUniversitySmartAccount(smartAccountAddress);

        // Encode the function call
        const calldata = targetContract.interface.encodeFunctionData(functionName, params);

        // Execute the view call through the smart account
        const results = await smartAccount.connect(connectedUniversity).executeViewCall(targetContractAddress, calldata);

        // Decode the result
        const decodedResults = targetContract.interface.decodeFunctionResult(functionName, results);

        if (DEBUG) {
            console.log("DEC RES = ", decodedResults);
        }

        return decodedResults;
    } catch (error) {
        logError('Smart account view call failed:', error);
        throw new Error(`Failed to execute view call to ${functionName}`);
    }
}
