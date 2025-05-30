import { Wallet, JsonRpcProvider } from 'ethers';
import { derivePrivateKey, formatDate } from './utils';
import { StudentsRegister__factory } from "../../../typechain-types/factories/contracts/StudentsRegister__factory"
import { Student__factory } from "../../../typechain-types/factories/contracts/Student__factory"
import { Credentials, StudentModel } from "../models/student"
import type { StudentsRegister } from '../../../typechain-types/contracts/StudentsRegister';
import UniversityModel from '../models/university';
import { University__factory } from "../../../typechain-types/factories/contracts/University__factory"
import { blockchainConfig, roleCodes, logError, DEBUG } from './conf';
import type { Student } from '../../../typechain-types/contracts/Student';
import { Permission, PermissionType } from '../models/permissions';
import { BaseContract } from 'ethers';
import { Result } from 'ethers';
import type { EntryPoint } from '../../../typechain-types/@account-abstraction/contracts/core/EntryPoint';
import { EntryPoint__factory } from '../../../typechain-types/factories/@account-abstraction/contracts/core/EntryPoint__factory';
import { AccountAbstraction } from './AccountAbstraction';

// Initialize provider once for reuse
const provider = new JsonRpcProvider(blockchainConfig.url);

/**
 * Retrieves the StudentsRegister contract instance.
 * @author Diego Da Giau
 * @returns {StudentsRegister} Connected contract instance
 * @throws {Error} If contract connection fails
 */
export function getStudentsRegister(): StudentsRegister {
    try {
        return StudentsRegister__factory.connect(blockchainConfig.registerAddress, provider);
    } catch (error) {
        logError('Failed to connect to StudentsRegister contract:', error);
        throw new Error('Could not establish connection to StudentsRegister contract');
    }
}

/**
 * Gets a connected instance of a Student contract for interaction.
 * @author Diego Da Giau
 * @param {StudentModel} student - Student model containing contract address
 * @returns {Student} Connected student contract instance
 * @throws {Error} If contract connection fails or address is invalid
 */
export function getStudentContract(student: StudentModel): Student {
    try {
        if (!student.accountAddress) {
            throw new Error('Student contract address is missing');
        }
        return Student__factory.connect(student.accountAddress, provider);
    } catch (error) {
        logError('Failed to connect to Student contract:', error);
        throw new Error('Could not establish connection to Student contract');
    }
}

/**
 * Creates a student wallet from credentials.
 * @author Diego Da Giau
 * @param {Credentials} credentials - Student's login credentials
 * @returns {Promise<Wallet>} Connected wallet instance
 * @throws {Error} If wallet creation fails or credentials are invalid
 */
export async function getStudentWallet(credentials: Credentials): Promise<Wallet> {
    try {
        if (!credentials.password || !credentials.id) {
            throw new Error('Invalid credentials: Missing password or ID');
        }
        const privateKey = await derivePrivateKey(credentials.password, credentials.id);
        return new Wallet(privateKey, provider);
    } catch (error) {
        logError('Failed to create student wallet:', error);
        throw new Error('Could not create student wallet from credentials');
    }
}

/**
 * Fetches and updates student information from the blockchain.
 * @author Diego Da Giau
 * @param {StudentModel} student - Student model to update
 * @throws {Error} If contract connection fails or data retrieval fails
 */
export async function getStudent(student: StudentModel): Promise<void> {
    try {
        if (!student.wallet) {
            throw new Error('Student wallet not initialized');
        }

        // Fetch student's information
        const studentContract = getStudentContract(student);
        const [studentTmp] = await executeSmartAccountViewCall(student, studentContract, student.accountAddress, 'getStudentInfo', []);

        const { basicInfo, results } = studentTmp;

        // Update student model
        student.name = basicInfo.name;
        student.surname = basicInfo.surname;
        student.birthPlace = basicInfo.birthPlace;
        student.birthDate = formatDate(basicInfo.birthDate);
        student.country = basicInfo.country;

        // Update academic results
        student.updateResults(results);
    } catch (error) {
        logError('Failed to fetch student data:', error);
        throw new Error('Could not retrieve student information');
    }
}

export async function getUniversity(universityAccountAddress: string): Promise<UniversityModel> {
    try {
        if (!universityAccountAddress) {
            throw new Error('University address is missing');
        }

        // Connect to university's smart contract using its wallet address
        const contract = University__factory.connect(universityAccountAddress, provider);

        // Fetch university information
        const {
            name,
            country,
            shortName
        } = await contract.getUniversityInfo();

        // Create and return new university model with fetched data
        return new UniversityModel(
            name,
            country,
            shortName,
            universityAccountAddress
        );
    } catch (error) {
        logError('Failed to fetch university data:', error);
        throw new Error('Could not retrieve university information');
    }
}

/**
 * Retrieves all permission records for a student from the blockchain.
 * @author Diego Da Giau
 * @param {StudentModel} student - The authenticated student model
 * @returns {Promise<Permission[]>} Array of all permissions (both requests and granted)
 * @throws {Error} If permissions cannot be retrieved from the blockchain
 */
export async function getRawPermissions(student: StudentModel): Promise<Permission[]> {
    try {
        if (!student.wallet) {
            throw new Error('Student wallet not initialized');
        }

        if (!student.accountAddress) {
            throw new Error('Student contract address is missing');
        }

        // Connect contract with student's wallet for auth
        const studentContract = getStudentContract(student).connect(student.wallet);

        // Get actual permissions in parallel using the retrieved types
        const [
            readRequests,
            writeRequests,
            reads,
            writes
        ] = await Promise.all([
            executeSmartAccountViewCall(student, studentContract, student.accountAddress, 'getPermissions', [roleCodes.readRequest])
                .then(result => result[0] as string[]),
            executeSmartAccountViewCall(student, studentContract, student.accountAddress, 'getPermissions', [roleCodes.writeRequest])
                .then(result => result[0] as string[]),
            executeSmartAccountViewCall(student, studentContract, student.accountAddress, 'getPermissions', [roleCodes.read])
                .then(result => result[0] as string[]),
            executeSmartAccountViewCall(student, studentContract, student.accountAddress, 'getPermissions', [roleCodes.write])
                .then(result => result[0] as string[]),
        ]);

        // Map string arrays to Permission objects arrays
        const readRequestPermissions: Permission[] = readRequests.map(universityAddress => ({
            university: universityAddress,
            type: PermissionType.Read,
            request: true
        }));

        const writeRequestPermissions: Permission[] = writeRequests.map(universityAddress => ({
            university: universityAddress,
            type: PermissionType.Write,
            request: true
        }));

        const readPermissions: Permission[] = reads.map(universityAddress => ({
            university: universityAddress,
            type: PermissionType.Read,
            request: false
        }));

        const writePermissions: Permission[] = writes.map(universityAddress => ({
            university: universityAddress,
            type: PermissionType.Write,
            request: false
        }));

        return [...readRequestPermissions, ...writeRequestPermissions, ...readPermissions, ...writePermissions];
    } catch (error) {
        logError('Failed to fetch permissions:', error);
        throw new Error('Could not retrieve permission information');
    }
}

/**
 * Revokes a university's permission to access student data.
 * @author Diego Da Giau
 * @param {StudentModel} student - The authenticated student model
 * @param {string} universityAddress - The address of the university to revoke
 * @returns {Promise<void>}
 * @throws {Error} If transaction fails or student wallet is not initialized
 */
export async function revokePermission(student: StudentModel, universityAddress: string): Promise<void> {
    try {
        if (!student.wallet) {
            throw new Error('Student wallet not initialized');
        }

        if (!universityAddress) {
            throw new Error('University address is required');
        }

        const contract = getStudentContract(student).connect(student.wallet);
        return await sendTransaction(student, contract, student.accountAddress, 'revokePermission', [universityAddress]);
    } catch (error) {
        logError('Failed to revoke permission:', error);
        throw new Error('Could not revoke university permission');
    }
}

/**
 * Grants permission to a university to access student data.
 * @author Diego Da Giau
 * @param {StudentModel} student - The authenticated student model
 * @param {Permission} permission - The permission to grant, including university and type
 * @returns {Promise<void>}
 * @throws {Error} If transaction fails, permission type is invalid, or student wallet is not initialized
 */
export async function grantPermission(student: StudentModel, permission: Permission): Promise<void> {
    try {
        if (!student.wallet) {
            throw new Error('Student wallet not initialized');
        }

        if (!permission || !permission.university) {
            throw new Error('Valid permission with university address is required');
        }

        const contract = getStudentContract(student).connect(student.wallet);
        let permissionType: string = "";

        switch (permission.type) {
            case PermissionType.Read:
                permissionType = roleCodes.read;
                break;
            case PermissionType.Write:
                permissionType = roleCodes.write;
                break;
            default:
                // Handle invalid permission type
                throw new Error("Invalid permission type specified");
        }

        return await sendTransaction(student, contract, student.accountAddress, 'grantPermission', [permissionType, permission.university]);
    } catch (error) {
        logError('Failed to grant permission:', error);
        throw new Error('Could not grant university permission');
    }
}

/**
 * Executes a view function call through a student's smart account contract.
 * This allows students to read data from contracts through their account abstraction wallet.
 * @author Diego Da Giau
 * @param {StudentModel} student - The authenticated student model with wallet
 * @param {BaseContract} targetContract - The contract interface to call
 * @param {string} targetContractAddress - The address of the contract to interact with
 * @param {string} functionName - The name of the view function to call
 * @param {any[]} params - Array of parameters to pass to the function
 * @returns {Promise<Result>} Decoded result from the view function call
 * @throws {Error} If view call fails or cannot be executed through the smart account
 */
export async function executeSmartAccountViewCall(student: StudentModel, targetContract: BaseContract, targetContractAddress: string, functionName: string, params: any[]): Promise<Result> {
    try {
        const smartAccount = getStudentContract(student);

        // Encode the function call
        const calldata = targetContract.interface.encodeFunctionData(functionName, params);

        // Execute the view call through the smart account
        const results = await smartAccount.connect(student.wallet).executeViewCall(targetContractAddress, calldata);

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
 * Sends a transaction to the blockchain through account abstraction.
 * Creates and executes a UserOperation without requiring the student to pay gas fees directly.
 * @author Diego Da Giau
 * @param {StudentModel} student - The authenticated student model with wallet and account address
 * @param {BaseContract} targetContract - The contract interface to call
 * @param {string} targetContractAddress - The address of the contract to interact with
 * @param {string} functionName - The name of the function to call
 * @param {any[]} params - Array of parameters to pass to the function
 * @returns {Promise<void>} Promise that resolves when the transaction is confirmed
 * @throws {Error} If transaction creation or execution fails
 */
export async function sendTransaction(student: StudentModel, targetContract: BaseContract, targetContractAddress: string, functionName: string, params: any[]): Promise<void> {
    try {
        // Initialize account abstraction manager
        const accountAbstraction = new AccountAbstraction(
            provider,
            student.wallet
        );

        // Create contract interface for target contract
        const targetContractInterface = targetContract.interface;

        const callData = targetContractInterface.encodeFunctionData(functionName, params);

        // Create user operation
        const userOp = await accountAbstraction.createUserOp({
            sender: student.accountAddress,
            target: targetContractAddress,
            value: 0n,
            data: callData,
        });

        // Execute the operation
        const tx = await accountAbstraction.executeUserOps([userOp], student.wallet.address);
        const receipt = await tx.wait();
        if (receipt) {
            accountAbstraction.verifyTransaction(receipt, targetContract);
        }
    } catch (error) {
        logError(`Failed to execute transaction ${functionName}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}
