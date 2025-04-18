import type { Student as StudentInterface, University as UniversityInterface, AcademicResult, StudentEthWalletInfo } from "./types";
import { blockchainConfig, ipfsConfig, logError, provider, s3Client } from "./conf";
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
 * Converts a blockchain timestamp to a human-readable ISO date string.
 * Handles the conversion from Unix epoch seconds to JavaScript milliseconds.
 * @author Diego Da Giau
 * @param {bigint} date - Unix timestamp as BigInt
 * @returns {string} ISO formatted date string
 */
export function computeDate(date: bigint): string {
    dayjs.extend(utc);
    return dayjs.utc(Number(date) * 1000).toISOString();
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
 * @param {Wallet} universityWallet - University wallet with read permissions
 * @param {Student.StudentBasicInfoStructOutput} student - Basic student information from contract
 * @param {Student.ResultStructOutput[]} results - Array of raw result data from contract
 * @returns {Promise<StudentInterface>} Complete student object with formatted results
 * @throws {Error} If a university cannot be found for a result
 */
export async function generateStudent(universityWallet: Wallet, student: Student.StudentBasicInfoStructOutput, results: Student.ResultStructOutput[]): Promise<StudentInterface> {
    try {
        // Get universities information for all results
        const universities = await getUniversities(universityWallet, new Set(results.map(r => r.university)));

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
            name: student.name,
            surname: student.surname,
            birthDate: computeDate(student.birthDate),
            birthPlace: student.birthPlace,
            country: student.country,
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
 * @param {Wallet} universityWallet - Wallet with permissions to read university data
 * @param {Set<string>} universitiesAddresses - Set of university blockchain addresses
 * @returns {Promise<Map<string, University>>} Map of university addresses to university details
 */
async function getUniversities(universityWallet: Wallet, universitiesAddresses: Set<string>): Promise<Map<string, UniversityInterface>> {
    try {
        // Get contract instance
        const studentsRegister = getStudentsRegister();

        // Convert set to array for contract call
        const universitiesArray = Array.from(universitiesAddresses);

        // Get university wallet addresses from the registry
        const universitiesContract = await studentsRegister
            .connect(universityWallet)
            .getUniversitiesWallets(universitiesArray);

        if (!universitiesContract || universitiesContract.length !== universitiesArray.length) {
            throw new Error('Failed to retrieve all university contracts');
        }

        // Create a map to store university details by address
        const universities = new Map<string, UniversityInterface>();

        // Fetch details for each university
        for (let i = 0; i < universitiesContract.length; i++) {
            try {
                universities.set(
                    universitiesArray[i],
                    await getUniversity(universityWallet, universitiesContract[i])
                );
            } catch (error) {
                logError(`Failed to get university data for ${universitiesArray[i]}:`, error);
                // Continue with other universities instead of failing completely
            }
        }

        if (universities.size === 0) {
            throw new Error('Failed to retrieve any university information');
        }

        return universities;
    } catch (error) {
        logError('Failed to get universities:', error);
        throw new Error('Failed to retrieve university information: ' + (error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Retrieves information about a single university.
 * Connects to the university's contract and fetches its details.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - Wallet with permissions to read university data
 * @param {string} universityContractAddress - Address of the university's contract
 * @returns {Promise<University>} University details
 */
async function getUniversity(universityWallet: Wallet, universityContractAddress: string): Promise<UniversityInterface> {
    try {
        // Connect to university contract
        const contract = University__factory.connect(universityContractAddress, provider);

        // Fetch university information
        const {
            name,
            country,
            shortName
        } = await contract.connect(universityWallet).getUniversityInfo();
        // Return formatted university object
        return {
            name,
            country,
            shortName,
        };
    } catch (error) {
        logError(`Failed to get university at address ${universityContractAddress}:`, error);
        throw new Error('Failed to retrieve university details: ' + (error instanceof Error ? error.message : String(error)));
    }
}
