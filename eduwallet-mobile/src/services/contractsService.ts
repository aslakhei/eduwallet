import 'react-native-get-random-values';
import { Wallet, JsonRpcProvider, BaseContract, Result } from 'ethers';
import { derivePrivateKey, formatDate } from '../utils/utils';
import { StudentsRegister__factory } from 'typechain-types/factories/contracts/StudentsRegister__factory';
import { Student__factory } from 'typechain-types/factories/contracts/Student__factory';
import { University__factory } from 'typechain-types/factories/contracts/University__factory';
import { Employer__factory } from 'typechain-types/factories/contracts/Employer__factory';
import { Credentials, StudentModel } from '../models/student';
import { EmployerCredentials, EmployerModel } from '../models/employer';
import type { StudentsRegister } from 'typechain-types/contracts/StudentsRegister';
import UniversityModel from '../models/university';
import { blockchainConfig, roleCodes, logError, DEBUG, provider } from './config';
import type { Student } from 'typechain-types/contracts/Student';
import { Permission, PermissionType } from '../models/permissions';
import { AccountAbstraction } from './AccountAbstraction';

/**
 * Retrieves the StudentsRegister contract instance.
 * @returns {StudentsRegister} Connected contract instance
 * @throws {Error} If contract connection fails
 */
export function getStudentsRegister(): StudentsRegister {
    try {
        return StudentsRegister__factory.connect(blockchainConfig.registerAddress, provider as any);
    } catch (error) {
        logError('Failed to connect to StudentsRegister contract:', error);
        throw new Error('Could not establish connection to StudentsRegister contract');
    }
}

/**
 * Gets a connected instance of a Student contract for interaction.
 * @param {StudentModel} student - Student model containing contract address
 * @returns {Student} Connected student contract instance
 * @throws {Error} If contract connection fails or address is invalid
 */
export function getStudentContract(student: StudentModel): Student {
    try {
        if (!student.accountAddress) {
            throw new Error('Student contract address is missing');
        }
        return Student__factory.connect(student.accountAddress, provider as any);
    } catch (error) {
        logError('Failed to connect to Student contract:', error);
        throw new Error('Could not establish connection to Student contract');
    }
}

/**
 * Creates a student wallet from credentials.
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
 * Creates an employer wallet from private key.
 * @param {EmployerCredentials} credentials - Employer's login credentials (private key)
 * @returns {Wallet} Connected wallet instance
 * @throws {Error} If wallet creation fails or credentials are invalid
 */
export function getEmployerWallet(credentials: EmployerCredentials): Wallet {
    try {
        if (!credentials.privateKey) {
            throw new Error('Invalid credentials: Missing private key');
        }
        if (!credentials.privateKey.startsWith('0x')) {
            throw new Error('Invalid private key format: Must start with 0x');
        }
        return new Wallet(credentials.privateKey, provider);
    } catch (error) {
        logError('Failed to create employer wallet:', error);
        throw new Error('Could not create employer wallet from credentials');
    }
}

/**
 * Fetches and updates student information from the blockchain.
 * @param {StudentModel} student - Student model to update
 * @throws {Error} If contract connection fails or data retrieval fails
 */
export async function getStudent(student: StudentModel): Promise<void> {
    try {
        if (!student.wallet) {
            throw new Error('Student wallet not initialized');
        }

        // Fetch student's information (both basic info and academic results)
        const studentContract = getStudentContract(student);
        const [studentTmp] = await executeSmartAccountViewCall(student, studentContract as unknown as BaseContract, student.accountAddress, 'getStudentInfo', []);

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

/**
 * Fetches university information from the blockchain.
 * @param {string} universityAccountAddress - University's smart account address
 * @returns {Promise<UniversityModel>} University model with fetched data
 */
export async function getUniversity(universityAccountAddress: string): Promise<UniversityModel> {
    try {
        if (!universityAccountAddress) {
            throw new Error('University address is missing');
        }

        // Connect to university's smart contract using its smart account address
        const contract = University__factory.connect(universityAccountAddress, provider as any);

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
        const studentContract = getStudentContract(student).connect(student.wallet as any);

        // Get actual permissions in parallel using the retrieved types
        const [
            readRequests,
            writeRequests,
            reads,
            writes,
            employerReadRequests,
            employerReads
        ] = await Promise.all([
            executeSmartAccountViewCall(student, studentContract as unknown as BaseContract, student.accountAddress, 'getPermissions', [roleCodes.readRequest])
                .then(result => result[0] as string[]),
            executeSmartAccountViewCall(student, studentContract as unknown as BaseContract, student.accountAddress, 'getPermissions', [roleCodes.writeRequest])
                .then(result => result[0] as string[]),
            executeSmartAccountViewCall(student, studentContract as unknown as BaseContract, student.accountAddress, 'getPermissions', [roleCodes.read])
                .then(result => result[0] as string[]),
            executeSmartAccountViewCall(student, studentContract as unknown as BaseContract, student.accountAddress, 'getPermissions', [roleCodes.write])
                .then(result => result[0] as string[]),
            executeSmartAccountViewCall(student, studentContract as unknown as BaseContract, student.accountAddress, 'getEmployerPermissions', [roleCodes.employerReadRequest])
                .then(result => result[0] as string[]),
            executeSmartAccountViewCall(student, studentContract as unknown as BaseContract, student.accountAddress, 'getEmployerPermissions', [roleCodes.employerRead])
                .then(result => result[0] as string[]),
        ]);

        // Map string arrays to Permission objects arrays for universities
        const readRequestPermissions: Permission[] = readRequests.map(address => ({
            address: address,
            type: PermissionType.Read,
            request: true,
            isEmployer: false
        }));

        const writeRequestPermissions: Permission[] = writeRequests.map(address => ({
            address: address,
            type: PermissionType.Write,
            request: true,
            isEmployer: false
        }));

        const readPermissions: Permission[] = reads.map(address => ({
            address: address,
            type: PermissionType.Read,
            request: false,
            isEmployer: false
        }));

        const writePermissions: Permission[] = writes.map(address => ({
            address: address,
            type: PermissionType.Write,
            request: false,
            isEmployer: false
        }));

        // Map string arrays to Permission objects arrays for employers
        const employerReadRequestPermissions: Permission[] = employerReadRequests.map(address => ({
            address: address,
            type: PermissionType.EmployerRead,
            request: true,
            isEmployer: true
        }));

        const employerReadPermissions: Permission[] = employerReads.map(address => ({
            address: address,
            type: PermissionType.EmployerRead,
            request: false,
            isEmployer: true
        }));

        return [...readRequestPermissions, ...writeRequestPermissions, ...readPermissions, ...writePermissions, ...employerReadRequestPermissions, ...employerReadPermissions];
    } catch (error) {
        logError('Failed to fetch permissions:', error);
        throw new Error('Could not retrieve permission information');
    }
}

/**
 * Revokes a university's permission to access student data.
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

        const contract = getStudentContract(student).connect(student.wallet as any);
        return await sendTransaction(student, contract as unknown as BaseContract, student.accountAddress, 'revokePermission', [universityAddress]);
    } catch (error) {
        logError('Failed to revoke permission:', error);
        throw new Error('Could not revoke university permission');
    }
}

/**
 * Retrieves employer information from the blockchain.
 * @param {string} employerAccountAddress - Employer's smart account address
 * @returns {Promise<EmployerModel>} Employer model with fetched data
 */
export async function getEmployer(employerAccountAddress: string): Promise<EmployerModel> {
    try {
        if (!employerAccountAddress) {
            throw new Error('Employer address is missing');
        }

        // Connect to employer's smart contract using its smart account address
        const contract = Employer__factory.connect(employerAccountAddress, provider as any);

        // Fetch employer information
        const {
            companyName,
            country,
            contactInfo
        } = await contract.getEmployerInfo();

        // Create and return new employer model with fetched data
        // Note: This function is used to fetch other employers' info, so we create a dummy wallet
        // The wallet is not used for this purpose, only the accountAddress matters
        const dummyWallet = new Wallet(Wallet.createRandom().privateKey, provider);
        return new EmployerModel(
            companyName,
            country,
            employerAccountAddress,
            dummyWallet,
            contactInfo || undefined
        );
    } catch (error) {
        logError('Failed to fetch employer data:', error);
        throw new Error('Could not retrieve employer information');
    }
}

/**
 * Fetches and updates employer information from the blockchain.
 * @param {EmployerModel} employer - Employer model to update (must have wallet and accountAddress)
 * @throws {Error} If contract connection fails or data retrieval fails
 */
export async function getEmployerInfo(employer: EmployerModel): Promise<void> {
    try {
        if (!employer.accountAddress) {
            throw new Error('Employer contract address is missing');
        }

        if (!employer.wallet) {
            throw new Error('Employer wallet is missing');
        }

        // Connect to employer's smart contract
        const contract = Employer__factory.connect(employer.accountAddress, provider as any);

        // Fetch employer information
        const {
            companyName,
            country,
            contactInfo
        } = await contract.getEmployerInfo();

        // Update employer model with fetched data
        employer.companyName = companyName;
        employer.country = country;
        employer.contactInfo = contactInfo || undefined;
    } catch (error) {
        logError('Failed to fetch employer data:', error);
        throw new Error('Could not retrieve employer information');
    }
}

/**
 * Grants read-only permission to an employer to access student data.
 * @param {StudentModel} student - The authenticated student model
 * @param {string} employerAddress - The address of the employer to grant permission to
 * @returns {Promise<void>}
 * @throws {Error} If transaction fails or student wallet is not initialized
 */
export async function grantEmployerPermission(student: StudentModel, employerAddress: string): Promise<void> {
    try {
        if (!student.wallet) {
            throw new Error('Student wallet not initialized');
        }

        if (!employerAddress) {
            throw new Error('Employer address is required');
        }

        const contract = getStudentContract(student).connect(student.wallet as any);
        return await sendTransaction(student, contract as unknown as BaseContract, student.accountAddress, 'grantEmployerPermission', [employerAddress]);
    } catch (error: any) {
        logError('Failed to grant employer permission:', error);
        // Preserve detailed error messages
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(error?.message || 'Could not grant employer permission');
    }
}

/**
 * Revokes an employer's permission to access student data.
 * @param {StudentModel} student - The authenticated student model
 * @param {string} employerAddress - The address of the employer to revoke
 * @returns {Promise<void>}
 * @throws {Error} If transaction fails or student wallet is not initialized
 */
export async function revokeEmployerPermission(student: StudentModel, employerAddress: string): Promise<void> {
    try {
        if (!student.wallet) {
            throw new Error('Student wallet not initialized');
        }

        if (!employerAddress) {
            throw new Error('Employer address is required');
        }

        const contract = getStudentContract(student).connect(student.wallet as any);
        return await sendTransaction(student, contract as unknown as BaseContract, student.accountAddress, 'revokeEmployerPermission', [employerAddress]);
    } catch (error) {
        logError('Failed to revoke employer permission:', error);
        throw new Error('Could not revoke employer permission');
    }
}

/**
 * Requests read-only access to a student's academic records for an employer.
 * @param {EmployerModel} employer - The authenticated employer model
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @returns {Promise<void>}
 * @throws {Error} If employer is not authenticated, student address is invalid, or request fails
 */
export async function requestEmployerAccess(employer: EmployerModel, studentWalletAddress: string): Promise<void> {
    try {
        if (!employer || !employer.wallet) {
            throw new Error('Employer wallet not initialized');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentContract = Student__factory.connect(studentWalletAddress, provider as any);

        // Send transaction through employer's smart account using account abstraction
        await sendEmployerTransaction(employer, studentContract as unknown as BaseContract, studentWalletAddress, 'askForPermission', [roleCodes.employerReadRequest]);
    } catch (error: any) {
        logError('Failed to request employer access:', error);
        // Preserve detailed error messages
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(error?.message || 'Could not request access to student records');
    }
}

/**
 * Retrieves student academic results for an employer (read-only, no personal information).
 * @param {EmployerModel} employer - The authenticated employer model
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @returns {Promise<any[]>} Array of academic results
 * @throws {Error} If employer is not authenticated, student address is invalid, or data retrieval fails
 */
export async function getStudentResultsForEmployer(employer: EmployerModel, studentWalletAddress: string): Promise<any[]> {
    try {
        if (!employer || !employer.wallet || !employer.accountAddress) {
            throw new Error('Employer wallet not initialized');
        }

        // Check if wallet has a provider
        if (!employer.wallet.provider) {
            throw new Error('Employer wallet provider is missing');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentContract = Student__factory.connect(studentWalletAddress, provider as any);

        // Execute view call through employer's smart account
        const results = await executeEmployerSmartAccountViewCall(employer, studentContract as unknown as BaseContract, studentWalletAddress, 'getResultsForEmployer', []);

        // Process results
        const rawResults = results[0] as any[];
        return rawResults.map((result: any) => ({
            code: result.code,
            name: result.name,
            degreeCourse: result.degreeCourse,
            ects: Number(result.ects) / 100,
            grade: result.grade || undefined,
            date: result.date ? formatDate(result.date) : undefined,
            certificateHash: result.certificateHash || undefined,
            university: result.university,
        }));
    } catch (error) {
        logError('Failed to retrieve student results for employer:', error);
        throw new Error('Could not retrieve student results');
    }
}

/**
 * Executes a view function call through an employer's smart account contract.
 * @param {EmployerModel} employer - The authenticated employer model with wallet
 * @param {BaseContract} targetContract - The contract interface to call
 * @param {string} targetContractAddress - The address of the contract to interact with
 * @param {string} functionName - The name of the view function to call
 * @param {any[]} params - Array of parameters to pass to the function
 * @returns {Promise<Result>} Decoded result from the view function call
 * @throws {Error} If view call fails or cannot be executed through the smart account
 */
export async function executeEmployerSmartAccountViewCall(employer: EmployerModel, targetContract: BaseContract, targetContractAddress: string, functionName: string, params: any[]): Promise<Result> {
    try {
        // Validate employer and wallet before proceeding
        if (!employer || !employer.wallet || !employer.accountAddress) {
            throw new Error('Employer wallet or account address is missing');
        }

        // Check if wallet has a provider
        if (!employer.wallet.provider) {
            throw new Error('Employer wallet provider is missing');
        }

        // Get employer's smart account contract
        const employerSmartAccount = Employer__factory.connect(employer.accountAddress, provider as any);

        // Encode the function call
        const calldata = targetContract.interface.encodeFunctionData(functionName, params);

        // Execute the view call through the employer's smart account
        const results = await employerSmartAccount.connect(employer.wallet as any).executeViewCall(targetContractAddress, calldata);

        // Decode the result
        const decodedResults = targetContract.interface.decodeFunctionResult(functionName, results);

        if (DEBUG) {
            console.log("DEC RES = ", decodedResults);
        }

        return decodedResults;
    } catch (error) {
        logError('Employer smart account view call failed:', error);
        throw new Error(`Failed to execute view call to ${functionName}`);
    }
}

/**
 * Sends a transaction to the blockchain through an employer's smart account using account abstraction.
 * @param {EmployerModel} employer - The authenticated employer model with wallet and account address
 * @param {BaseContract} targetContract - The contract interface to call
 * @param {string} targetContractAddress - The address of the contract to interact with
 * @param {string} functionName - The name of the function to call
 * @param {any[]} params - Array of parameters to pass to the function
 * @returns {Promise<void>} Promise that resolves when the transaction is confirmed
 * @throws {Error} If transaction creation or execution fails
 */
export async function sendEmployerTransaction(employer: EmployerModel, targetContract: BaseContract, targetContractAddress: string, functionName: string, params: any[]): Promise<void> {
    try {
        // Initialize account abstraction manager
        const accountAbstraction = new AccountAbstraction(
            provider,
            employer.wallet
        );

        // Create contract interface for target contract
        const targetContractInterface = targetContract.interface;

        const callData = targetContractInterface.encodeFunctionData(functionName, params);

        // Create user operation
        const userOp = await accountAbstraction.createUserOp({
            sender: employer.accountAddress,
            target: targetContractAddress,
            value: 0n,
            data: callData,
        });

        // Execute the operation
        const tx = await accountAbstraction.executeUserOps([userOp], employer.wallet.address);
        const receipt = await tx.wait();
        if (receipt) {
            accountAbstraction.verifyTransaction(receipt, targetContract);
        }
    } catch (error) {
        logError(`Failed to execute employer transaction ${functionName}:`, error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

/**
 * Grants permission to a university to access student data.
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

        if (!permission || !permission.address) {
            throw new Error('Valid permission with address is required');
        }

        const contract = getStudentContract(student);

        // Handle employer permissions separately
        if (permission.isEmployer && permission.type === PermissionType.EmployerRead) {
            return await sendTransaction(student, contract as unknown as BaseContract, student.accountAddress, 'grantEmployerPermission', [permission.address]);
        }

        // Handle university permissions
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

        return await sendTransaction(student, contract as unknown as BaseContract, student.accountAddress, 'grantPermission', [permissionType, permission.address]);
    } catch (error) {
        logError('Failed to grant permission:', error);
        throw new Error('Could not grant permission');
    }
}

/**
 * Executes a view function call through a student's smart account contract.
 * This allows students to read data from contracts through their account abstraction wallet.
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
        const results = await smartAccount.connect(student.wallet as any).executeViewCall(targetContractAddress, calldata);

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
 * Sends a transaction to the blockchain through account abstraction.
 * Creates and executes a UserOperation without requiring the student to pay gas fees directly.
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

