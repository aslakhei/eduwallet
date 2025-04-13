import { ethers, JsonRpcProvider, Wallet, NonceManager } from 'ethers';
import * as crypto from 'crypto';
import { StudentsRegister } from '@typechain/contracts';
import { StudentsRegister__factory } from "@typechain/factories/contracts/StudentsRegister__factory"
import { StudentDeployer__factory } from '@typechain/factories/contracts/StudentDeployer__factory';
import { UniversityDeployer__factory } from '@typechain/factories/contracts/UniversityDeployer__factory';
import * as eduwallet from 'eduwallet-sdk';
import * as dotenv from 'dotenv';


// Load environment variables first before using them
dotenv.config();
const VERBOSE = process.env.VERBOSE || false;

// Initialize provider with the RPC URL from environment or use localhost as fallback
const PROVIDER = new JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");

const deployer = getDeployer();
let studentsRegister: StudentsRegister | undefined;
export let uni: Wallet | undefined;

/**
 * Retrieves the deployer wallet using the private key from environment variables.
 * This wallet is used for initial contract deployment and funding operations.
 * @author Diego Da Giau
 * @returns {Wallet} The deployer wallet connected to the provider
 * @throws {Error} If the deployer private key is not found in environment variables
 */
function getDeployer(): Wallet {
    const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!deployerPrivateKey) {
        throw new Error("Deployer private key not found in environment variables");
    }
    const deployer = new Wallet(deployerPrivateKey, PROVIDER);

    if (VERBOSE) {
        console.log(`---------------------------------------------------`);
        console.log(`DEPLOYER:`);
        console.log(`Address: ${deployer.address}`)
        console.log(`---------------------------------------------------`);
    }

    return deployer;
}

/**
 * Deploys the core Students Register contract and its dependencies to the blockchain.
 * First deploys the StudentDeployer and UniversityDeployer contracts in parallel,
 * then deploys the StudentsRegister contract with references to the deployers.
 * @author Diego Da Giau
 * @returns {Promise<void>} Promise that resolves when all contracts are successfully deployed
 * @throws {Error} If any part of the deployment process fails, with the error message from the underlying error
 */
export async function deployStudentsRegister(): Promise<void> {
    try {
        // Use NonceManager to handle concurrent transactions
        const managedDeployer = new NonceManager(deployer);

        // Deploy StudentDeployer contract using TypeChain factory
        const studentDeployerFactory = new StudentDeployer__factory(managedDeployer);
        const studentDeployer = await studentDeployerFactory.deploy();

        // Deploy UniversityDeployer contract using TypeChain factory
        const universityDeployerFactory = new UniversityDeployer__factory(managedDeployer);
        const universityDeployer = await universityDeployerFactory.deploy();

        // Create promises to wait for deployments and get addresses
        const studentDeployerAddressPromise = async () => {
            await studentDeployer.waitForDeployment();
            return studentDeployer.getAddress();
        };

        const universityDeployerAddressPromise = async () => {
            await universityDeployer.waitForDeployment();
            return universityDeployer.getAddress();
        };

        // Wait for both deployers to be deployed in parallel
        const [studentDeployerAddress, universityDeployerAddress] = await Promise.all([
            studentDeployerAddressPromise(),
            universityDeployerAddressPromise(),
        ]);

        // Deploy StudentsRegister contract using TypeChain factory
        const studentsRegisterFactory = new StudentsRegister__factory(managedDeployer);
        const register = await studentsRegisterFactory.deploy(
            studentDeployerAddress,
            universityDeployerAddress
        );
        await register.waitForDeployment();
        const address = await register.getAddress();

        // Log deployment information if verbose mode is enabled
        if (VERBOSE) {
            console.log(`\n---------------------------------------------------`);
            console.log(`STUDENT DEPLOYER:`);
            console.log(`Address: ${studentDeployerAddress}`);
            console.log(`---------------------------------------------------`);
            console.log(`---------------------------------------------------`);
            console.log(`UNIVERSITY DEPLOYER:`);
            console.log(`Address: ${universityDeployerAddress}`);
            console.log(`---------------------------------------------------`);
            console.log(`---------------------------------------------------`);
            console.log(`STUDENT REGISTER:`);
            console.log(`Address: ${address}`);
            console.log(`---------------------------------------------------\n`);
        }

        // Store the deployed register for future use
        studentsRegister = register;
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Creates a new university.
 * Generates a random private key and connects the wallet with the provider.
 * @author Diego Da Giau
 * @returns {Wallet} The university wallet connected to the system provider
 * @throws {Error} If wallet creation fails, with the error message from the underlying error
 */
function getUniversityWallet(): Wallet {
    try {
        // Generate a random private key for the university
        const privateKey = crypto.randomBytes(32).toString('hex');
        const universityPrivateKey = `0x${privateKey}`;
        const wallet = new Wallet(universityPrivateKey, PROVIDER);

        // Display university credentials
        console.log(`\n---------------------------------------------------`);
        console.log(`UNIVERSITY:`);
        console.log(`Private key: ${universityPrivateKey}`);
        if (VERBOSE) {
            console.log(`Address: ${wallet.address}`)
        }
        console.log(`---------------------------------------------------\n`);

        return wallet;
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Registers a new university in the academic blockchain system.
 * Creates a university wallet, funds it, and subscribes it to the system.
 * @author Diego Da Giau
 * @param {string} name - The university's full name
 * @param {string} country - The university's country
 * @param {string} shortName - The university's abbreviated name
 * @returns {Promise<void>} Promise that resolves when the university is successfully subscribed
 * @throws {Error} If the students register contract is not deployed or if any part of the subscription process fails, with the error message from the underlying error
 */
export async function subscribeUniversity(name: string, country: string, shortName: string): Promise<void> {
    if (!studentsRegister) {
        throw new Error("Students register not deployed - run deployStudentsRegister first");
    }

    try {
        const university = getUniversityWallet();

        // Fund the university wallet with a substantial balance
        const balance = ethers.parseEther("10000000.0")
        const deployer = getDeployer();

        // Send funds from deployer to the new university wallet
        const tx = await deployer.sendTransaction({
            to: university.address,
            value: balance,
        })

        // Wait for the transaction to be confirmed
        await tx.wait();

        // Subscribe the university to the register
        const universityTx = await studentsRegister.connect(university).subscribe(
            name,
            country,
            shortName
        );

        // Store the university wallet for future operations
        uni = university;

        // Wait for the transaction to be confirmed
        await universityTx.wait();
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Registers a new student in the academic blockchain system.
 * Creates both a student Ethereum wallet and academic record.
 * Also funds the student's Ethereum wallet with initial ETH.
 * @author Diego Da Giau
 * @param {string} name - The student's first name
 * @param {string} surname - The student's last name
 * @param {string} birthDate - The student's date of birth in YYYY-MM-DD format
 * @param {string} birthPlace - The student's place of birth
 * @param {string} country - The student's country of birth
 * @returns {Promise<void>} Promise that resolves when the student is successfully registered
 * @throws {Error} If no university wallet is available for registration or if any part of the registration process fails, with the error message from the underlying error
 */
export async function registerStudent(name: string, surname: string, birthDate: string, birthPlace: string, country: string): Promise<void> {
    if (!uni) {
        throw new Error("University not present")
    }
    try {
        // Register the student using the SDK
        const student = await eduwallet.registerStudent(
            uni,
            {
                name,
                surname,
                birthDate,
                birthPlace,
                country,
            });

        // Display student credentials
        console.log(`\n---------------------------------------------------`);
        console.log(`STUDENT:`);
        if (VERBOSE) {
            console.log(`Address: ${student.ethWallet.address}`);
        }
        console.log(`Wallet address: ${student.academicWalletAddress}`);
        console.log(`Id: ${student.id}`);
        console.log(`Password: ${student.password}`);
        console.log(`---------------------------------------------------\n`);

        // Fund the wallet
        if (VERBOSE) {
            console.log("\nFunding the password-derived wallet...");
        }

        // Create a transaction to fund the student wallet
        const balance = ethers.parseEther("10000.0")
        const tx = await deployer.sendTransaction({
            to: student.ethWallet.address,
            value: balance,
        });

        // Wait for the transaction to be confirmed
        await tx.wait();

        if (VERBOSE) {
            console.log(`Balance: ${ethers.formatEther(balance)}`);
        }
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Retrieves basic student information from the blockchain.
 * Only fetches personal data without academic results.
 * @author Diego Da Giau
 * @param {string} studentWallet - The student's academic wallet address
 * @returns {Promise<void>} Promise that resolves when student information is successfully retrieved
 * @throws {Error} If no university wallet is available for retrieval or if the retrieval process fails, with the error message from the underlying error
 */
export async function getStudentInfo(studentWallet: string): Promise<void> {
    if (!uni) {
        throw new Error("University not present - subscribe a university first");
    }

    try {
        console.log("\nFetching student info...");
        // Retrieve student information using the SDK
        const studentNew = await eduwallet.getStudentInfo(uni, studentWallet);

        // Display student information
        console.log(`---------------------------------------------------`);
        console.log(`STUDENT:`);
        console.log(`Name: ${studentNew.name}`);
        console.log(`Surname: ${studentNew.surname}`);
        console.log(`Birth date: ${studentNew.birthDate}`);
        console.log(`Birth place: ${studentNew.birthPlace}`);
        console.log(`Country: ${studentNew.country}`);
        console.log(`---------------------------------------------------`);
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Retrieves student information including academic results.
 * Provides a complete academic profile with course outcomes.
 * @author Diego Da Giau
 * @param {string} studentWallet - The student's academic wallet address
 * @returns {Promise<void>} Promise that resolves when student information and results are successfully retrieved
 * @throws {Error} If no university wallet is available for retrieval or if the retrieval process fails, with the error message from the underlying error
 */
export async function getStudentInfoResults(studentWallet: string): Promise<void> {
    if (!uni) {
        throw new Error("University not present - subscribe a university first");
    }

    try {
        // Retrieve complete student information with results using the SDK
        const studentComplete = await eduwallet.getStudentWithResult(uni, studentWallet);

        // Display comprehensive student information and results
        console.log(`\n---------------------------------------------------`);
        console.log(`STUDENT:`);
        console.log(`Name: ${studentComplete.name}`);
        console.log(`Surname: ${studentComplete.surname}`);
        console.log(`Birth date: ${studentComplete.birthDate}`);
        console.log(`Birth place: ${studentComplete.birthPlace}`);
        console.log(`Country: ${studentComplete.country}`);
        console.log(`Results:`);

        // Iterate through and display each academic result
        for (const result of studentComplete.results ?? []) {
            console.log(`\tCourse Code: ${result.code}`);
            console.log(`\tCourse Name: ${result.name}`);
            console.log(`\tUniversity: ${result.university.name}`);
            console.log(`\tDegree course: ${result.degreeCourse}`);
            console.log(`\tECTS: ${result.ects || "N/A"}`);
            console.log(`\tDate: ${result.evaluationDate ? result.evaluationDate : "N/A"}`);
            console.log(`\tGrade: ${result.grade || "N/A"}`);
            console.log(`\tCertificate: ${result.certificate || "N/A"}\n`);
        }
        console.log(`---------------------------------------------------\n`);
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Enrolls a student in one or more academic courses.
 * Submits enrollment transactions to the blockchain.
 * @author Diego Da Giau
 * @param {string} studentWallet - The student's academic wallet address
 * @param {eduwallet.CourseInfo[]} courses - Array of courses to enroll the student in
 * @returns {Promise<void>} Promise that resolves when the student is successfully enrolled in all courses
 * @throws {Error} If no university wallet is available for enrollment, if any enrollments fail, or if the enrollment process encounters an error, with the error message from the underlying error
 */
export async function enrollStudent(studentWallet: string, courses: eduwallet.CourseInfo[]): Promise<void> {
    if (!uni) {
        throw new Error("University not present - subscribe a university first");
    }

    try {
        if (VERBOSE) {
            console.log("\nEnrolling student...");
        }
        // Use the SDK to enroll the student in the courses
        let failedCourses = await eduwallet.enrollStudent(uni, studentWallet, courses);

        // TODO: Implement retry logic for failed enrollments
        // while (tx.length > 0) {
        //     tx = await eduwallet.enrollStudent(uni, studentWallet, courses);
        // }

        if (failedCourses.length > 0) {
            throw new Error(`Failed to enroll student in ${failedCourses.length} courses`);
        }
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Records academic evaluations for a student's enrolled courses.
 * Submits evaluation transactions to the blockchain.
 * @author Diego Da Giau
 * @param {string} studentWallet - The student's academic wallet address
 * @param {eduwallet.Evaluation[]} evaluations - Array of academic evaluations to record
 * @returns {Promise<void>} Promise that resolves when the student is successfully evaluated for all submitted courses
 * @throws {Error} If no university wallet is available for evaluation, if any evaluations fail, or if the evaluation process encounters an error, with the error message from the underlying error
 */
export async function evaluateStudent(studentWallet: string, evaluations: eduwallet.Evaluation[]): Promise<void> {
    if (!uni) {
        throw new Error("University not present - subscribe a university first");
    }

    try {
        if (VERBOSE) {
            console.log("\nEvaluating student...");
        }

        // Use the SDK to record evaluations for the student
        let failedCourses = await eduwallet.evaluateStudent(uni, studentWallet, evaluations);

        // TODO: Implement retry logic for failed evaluations
        // while (tx.length > 0) {
        //     tx = await eduwallet.evaluateStudent(uni, studentWallet, evaluations);
        // }

        if (failedCourses.length > 0) {
            throw new Error(`Failed to evaluate student in ${failedCourses.length} courses`);
        }
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Requests permission to access a student's academic wallet.
 * Universities must request access before they can read or modify student records.
 * @author Diego Da Giau
 * @param {string} studentWallet - The student's academic wallet address
 * @param {eduwallet.PermissionType} permission - Type of permission requested (Read or Write)
 * @returns {Promise<void>} Promise that resolves when the permission request is submitted and confirmed
 * @throws {Error} If no university wallet is available for requesting permission or if the permission request process fails, with the error message from the underlying error
 */
export async function requestPermission(studentWallet: string, permission: eduwallet.PermissionType): Promise<void> {
    if (!uni) {
        throw new Error("University not present - subscribe a university first");
    }

    try {
        if (VERBOSE) {
            console.log(`\nAsking for ${permission === eduwallet.PermissionType.Read ? 'read' : 'write'} permission...`)
        }

        // Use the SDK to request permission for the student's wallet
        await eduwallet.askForPermission(uni, studentWallet, permission);

        if (VERBOSE) {
            console.log(`Permission request submitted successfully`);
        }
    } catch (error) {
        throw new Error(`${error}`);
    }
}

/**
 * Verifies a university's permission level for a student's academic wallet.
 * Checks the current permission level available to the active university wallet.
 * @author Diego Da Giau
 * @param {string} studentWallet - The student's academic wallet address
 * @returns {Promise<void>} Promise that resolves when the permission verification is complete
 * @throws {Error} If no university wallet is available for verification or if the verification process fails, with the error message from the underlying error
 */
export async function verifyPermission(studentWallet: string): Promise<void> {
    if (!uni) {
        throw new Error("University not present - subscribe a university first");
    }

    try {
        if (VERBOSE) {
            console.log(`\nVerifying permission...`)
        }

        // Use the SDK to check the current permission level
        const permission = await eduwallet.verifyPermission(uni, studentWallet);

        // Display the permission level
        console.log(`\nPERMISSION:`);
        console.log(`Type: ${permission === null ? 'None' : permission === eduwallet.PermissionType.Read ? 'Read' : 'Write'}\n`);
    } catch (error) {
        throw new Error(`${error}`);

    }
}

/**
 * Changes the active university wallet used for all operations.
 * Allows switching between different university credentials.
 * @author Diego Da Giau
 * @param {Wallet} newUniversity - The new university wallet to use
 * @returns {void}
 * @throws {Error} If connecting the new university wallet fails, with the error message from the underlying error
 */
export function changeUniversity(newUniversity: Wallet): void {
    try {
        // Connect the new university wallet to the provider
        uni = newUniversity.connect(PROVIDER);
    } catch (error) {
        throw new Error(`${error}`);
    }
}
