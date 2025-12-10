import { Wallet } from "ethers";
import type { CourseInfo, Evaluation, Student, StudentCredentials, StudentData, Employer, EmployerData, AcademicResult } from "./types";
import { PermissionType } from "./types";
import { computeDate, createStudentWallet, executeSmartAccountViewCall, generateStudent, getStudentContract, getStudentsRegister, getUniversityAccountAddress, getUniversitySmartAccount, getEmployerAccountAddress, getEmployer, getEmployerSmartAccount, getUniversities, publishCertificate, sendTransaction, AccountType } from "./utils";
import { blockchainConfig, DEBUG, ipfsConfig, logError, provider, roleCodes } from "./conf";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import type { Student as StudentContract } from '@typechain/contracts/Student';

/**
 * Re-export types for SDK consumers
 */
export type { StudentCredentials, StudentData, CourseInfo, Evaluation, Student, Employer, EmployerData, AcademicResult}
export { PermissionType };

// Configure dayjs to use UTC for consistent date handling across timezones
dayjs.extend(utc);

/**
 * Registers a new student in the academic blockchain system.
 * Creates both a student EOA and smart account.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet with registration permissions
 * @param {StudentData} student - The student information to register
 * @returns {Promise<StudentCredentials>} The created student credentials and wallet information
 * @throws {Error} If university wallet is missing, student data is incomplete, or registration fails
 */
export async function registerStudent(universityWallet: Wallet, student: StudentData): Promise<StudentCredentials> {
    try {
        // Validate input parameters
        if (!universityWallet) {
            throw new Error('University wallet is required');
        }

        if (!student) {
            throw new Error('Student data is required');
        }

        if (!student.name || !student.surname || !student.birthDate || !student.birthPlace || !student.country) {
            throw new Error('Student data is incomplete - all fields are required');
        }

        if (new Date(student.birthDate) <= new Date('1970-01-01')) {
            throw new Error('Student birthdate is incompatible - the date must be after 1970-01-01')
        }

        // Get contract instance
        const studentsRegister = getStudentsRegister();

        // Verify university is registered before attempting student registration
        try {
            await getUniversityAccountAddress(universityWallet);
        } catch (error) {
            throw new Error('University is not registered. Please register the university first using the CLI.');
        }

        // Create a new Ethereum wallet for the student
        const studentEthWallet = createStudentWallet();

        // Format student data for the contract
        const basicInfo: StudentContract.StudentBasicInfoStruct = {
            name: student.name,
            surname: student.surname,
            birthDate: dayjs.utc(student.birthDate).unix(),
            birthPlace: student.birthPlace,
            country: student.country
        }

        const connectedStudent = studentEthWallet.ethWallet.connect(provider);

        await sendTransaction(universityWallet, studentsRegister, blockchainConfig.registerAddress, 'registerStudent', [connectedStudent.address, basicInfo], AccountType.University);

        const studentAccountAddress = await studentsRegister.connect(connectedStudent).getStudentAccount();

        // Return complete student credentials
        return {
            id: studentEthWallet.id,
            password: studentEthWallet.password,
            academicWalletAddress: studentAccountAddress,
        }
    } catch (error) {
        logError('Failed to register student:', error)
        throw new Error('Failed to register student');
    }
}

/**
 * Enrolls a student in one or more academic courses.
 * Records course enrollments on the student's academic blockchain record, establishing the foundation for future evaluations.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet with enrollment authority
 * @param {string} studentWalletAddress - The student's academic wallet address on blockchain
 * @param {CourseInfo[]} courses - Array of courses to enroll the student in (code, name, degreeCourse, ects)
 * @returns {Promise<void>} Promise that resolves when all enrollments are successfully recorded
 * @throws {Error} If university wallet is missing, student address is invalid, course data is invalid, or enrollment transaction fails
 */
export async function enrollStudent(universityWallet: Wallet, studentWalletAddress: string, courses: CourseInfo[]): Promise<void> {
    try {
        // Input validation
        if (!universityWallet) {
            throw new Error('University wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        if (!courses || !Array.isArray(courses) || courses.length === 0) {
            throw new Error('At least one course is required for enrollment');
        }

        // Validate course data
        courses.forEach((course, index) => {
            if (!course.code || !course.name || !course.degreeCourse || course.ects <= 0 || course.ects > 100) {
                throw new Error(`Invalid course data at index ${index}: all fields are required and ECTS must be positive and less than 100`);
            }
        });

        // Get student contract instance
        const studentWallet = getStudentContract(studentWalletAddress);

        // Connect university wallet to provider
        const connectedUniversity = universityWallet.connect(provider);

        const coursesInfo: StudentContract.EnrollmentInfoStruct[] = courses.map(c => {
            return {
                code: c.code,
                name: c.name,
                degreeCourse: c.degreeCourse,
                ects: c.ects*100,
            };
        });

        await sendTransaction(connectedUniversity, studentWallet, studentWalletAddress, 'enroll', [coursesInfo], AccountType.University);

    } catch (error) {
        logError('Enrollment process failed:', error);
        throw new Error('Student enrollment failed');
    }
}

/**
 * Records academic evaluations for a student's enrolled courses.
 * Publishes certificates to IPFS when provided and records evaluations on the blockchain.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet with evaluation permissions
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @param {Evaluation[]} evaluations - Array of academic evaluations to record
 * @returns {Promise<void>} Promise that resolves when all evaluations are successfully recorded
 * @throws {Error} If university wallet is missing, student address is invalid, evaluation data is invalid, or the evaluation transaction fails
 */
export async function evaluateStudent(universityWallet: Wallet, studentWalletAddress: string, evaluations: Evaluation[]): Promise<void> {
    try {
        // Input validation
        if (!universityWallet) {
            throw new Error('University wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        if (!evaluations || !Array.isArray(evaluations) || evaluations.length === 0) {
            throw new Error('At least one evaluation is required');
        }

        // Validate evaluation data
        evaluations.forEach((evaluation, index) => {
            if (!evaluation.code) {
                throw new Error(`Evaluation at index ${index} missing required field: code`);
            }
            if (!evaluation.grade) {
                throw new Error(`Evaluation at index ${index} has invalid grade: ${evaluation.grade}`);
            }
            if (!evaluation.evaluationDate) {
                throw new Error(`Evaluation at index ${index} missing required field: evaluationDate`);
            }
            if (new Date(evaluation.evaluationDate) <= new Date('1970-01-01')) {
                throw new Error('Student birthdate is incompatible - the date must be after 1970-01-01')
            }
        });

        // Get student contract instance
        const studentWallet = getStudentContract(studentWalletAddress);

        // Connect university wallet to provider with NonceManager
        const connectedUniversity = universityWallet.connect(provider);

        const contractEvaluations: StudentContract.EvaluationInfoStruct[] = [];

        for (const evaluation of evaluations) {
            // Publish certificate to IPFS if provided
            let certificate = '';
            if (evaluation.certificate) {
                try {
                    certificate = await publishCertificate(evaluation.certificate);
                } catch (certError) {
                    logError(`Failed to publish certificate for course ${evaluation.code}:`, certError);
                    throw certError;
                }
            }
            contractEvaluations.push({
                code: evaluation.code,
                grade: evaluation.grade,
                date: dayjs.utc(evaluation.evaluationDate).unix(),
                certificateHash: certificate
            });
        }

        await sendTransaction(connectedUniversity, studentWallet, studentWalletAddress, 'evaluate', [contractEvaluations], AccountType.University);
    } catch (error) {
        logError('Evaluation process failed:', error);
        // Preserve the original error message if it's informative
        if (error instanceof Error && error.message) {
            throw new Error(`Student evaluation failed: ${error.message}`);
        }
        throw new Error('Student evaluation failed');
    }
}

/**
 * Retrieves basic student information from the blockchain.
 * Only fetches personal data without academic results.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @returns {Promise<Student>} The student's basic information
 * @throws {Error} If university wallet is missing, student address is invalid, or data retrieval fails
 */
export async function getStudentInfo(universityWallet: Wallet, studentWalletAddress: string): Promise<Student> {
    try {
        // Input validation
        if (!universityWallet) {
            throw new Error('University wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentWallet = getStudentContract(studentWalletAddress);

        // Fetch student's basic information
        const student = await studentWallet.getStudentBasicInfo();

        if (DEBUG) {
            console.log('Student: ', student);
        }

        // Validate retrieved data
        if (
            !student ||
            !student.name ||
            !student.surname ||
            student.birthDate === undefined ||
            !student.birthPlace ||
            !student.country
        ) {
            throw new Error('Received invalid or empty student data');
        }

        // Format and return student data
        return {
            name: student.name,
            surname: student.surname,
            birthDate: computeDate(student.birthDate),
            birthPlace: student.birthPlace,
            country: student.country,
        };
    } catch (error) {
        logError('Failed to retrieve student information:', error);
        throw new Error('Failed to retrieve student information');
    }
}

/**
 * Retrieves student information including academic results.
 * Provides a complete academic profile with course outcomes.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet with read permissions
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @returns {Promise<Student>} The student's complete information with academic results
 * @throws {Error} If university wallet is missing, student address is invalid, or data retrieval fails
 */
export async function getStudentWithResult(universityWallet: Wallet, studentWalletAddress: string): Promise<Student> {
    try {
        // Input validation
        if (!universityWallet) {
            throw new Error('University wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentAccount = getStudentContract(studentWalletAddress);

        // Connect university wallet to provider
        const connectedUniversity = universityWallet.connect(provider);

        // Fetch student data and results in parallel for efficiency
        const [student, results] = await Promise.all([
            getStudentInfo(universityWallet, studentWalletAddress),
            executeSmartAccountViewCall(connectedUniversity, studentAccount, studentWalletAddress, 'getResults', [], AccountType.University),
        ]);

        // Validate retrieved data
        if (!student) {
            throw new Error('Received invalid or empty student data');
        }

        // Generate complete student object with processed results
        return await generateStudent(student, results[0]);
    } catch (error) {
        logError('Failed to retrieve complete student information:', error);
        throw new Error('Failed to retrieve complete student information');
    }
}

/**
 * Requests permission to access a student's academic wallet.
 * Universities must request access before they can read or modify student records.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet requesting permission
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @param {PermissionType} type - Type of permission requested (Read or Write)
 * @returns {Promise<void>} Promise that resolves when the permission request is submitted and confirmed
 * @throws {Error} If university wallet is missing, student address is invalid, permission type is invalid, or permission request fails
 */
export async function askForPermission(universityWallet: Wallet, studentWalletAddress: string, type: PermissionType): Promise<void> {
    try {
        // Input validation
        if (!universityWallet) {
            throw new Error('University wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        if (type !== PermissionType.Read && type !== PermissionType.Write) {
            throw new Error(`Invalid permission type: ${type}. Must be Read or Write.`);
        }

        // Get student contract instance
        const studentWallet = getStudentContract(studentWalletAddress);

        // Connect university wallet to provider
        const connectedUniversity = universityWallet.connect(provider);

        // Determine the permission code based on requested type
        const permission = type === PermissionType.Read ? roleCodes.readRequest : roleCodes.writeRequest;

        await sendTransaction(connectedUniversity, studentWallet, studentWalletAddress, 'askForPermission', [permission], AccountType.University);
    } catch (error) {
        logError('Failed to request permission:', error);
        throw new Error('Failed to request permission');
    }
}

/**
 * Registers a new employer in the academic blockchain system.
 * Creates an employer smart account.
 * @author Aslak Heimdal
 * @param {Wallet} adminWallet - The admin wallet with registration permissions
 * @param {string} employerPrivateKey - The employer's private key (0x-prefixed hex string)
 * @param {EmployerData} employer - The employer information to register
 * @returns {Promise<string>} The employer's smart account address
 * @throws {Error} If admin wallet is missing, employer data is incomplete, or registration fails
 */
export async function registerEmployer(adminWallet: Wallet, employerPrivateKey: string, employer: EmployerData): Promise<string> {
    try {
        // Validate input parameters
        if (!adminWallet) {
            throw new Error('Admin wallet is required');
        }

        if (!employerPrivateKey) {
            throw new Error('Employer private key is required');
        }

        if (!employer) {
            throw new Error('Employer data is required');
        }

        if (!employer.companyName || !employer.country) {
            throw new Error('Employer data is incomplete - company name and country are required');
        }

        // Create employer wallet from private key
        const employerWallet = new Wallet(employerPrivateKey, provider);
        const employerAddress = employerWallet.address;

        // Get contract instance
        const studentsRegister = getStudentsRegister();

        // Connect admin wallet to provider
        const connectedAdmin = adminWallet.connect(provider);

        // Register the employer using the employer's EOA address
        // Note: subscribeEmployer is marked onlyOwner, so it must be called directly from the owner EOA,
        // not through account abstraction (which would change msg.sender to the smart account address)
        const tx = await studentsRegister.connect(connectedAdmin).subscribeEmployer(
            employerAddress,
            employer.companyName,
            employer.country,
            employer.contactInfo || ''
        );
        
        // Wait for transaction confirmation
        await tx.wait();

        // Get the employer's smart account address using the employer's wallet
        const employerAccountAddress = await studentsRegister.connect(employerWallet).getEmployerAccount();

        return employerAccountAddress;
    } catch (error) {
        logError('Failed to register employer:', error);
        throw new Error('Failed to register employer');
    }
}

/**
 * Requests read-only access to a student's academic records for an employer.
 * Employers must request access before they can view student records.
 * @author Aslak Heimdal
 * @param {Wallet} employerWallet - The employer wallet requesting permission
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @returns {Promise<void>} Promise that resolves when the permission request is submitted and confirmed
 * @throws {Error} If employer wallet is missing, student address is invalid, or permission request fails
 */
export async function requestEmployerAccess(employerWallet: Wallet, studentWalletAddress: string): Promise<void> {
    try {
        // Input validation
        if (!employerWallet) {
            throw new Error('Employer wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentWallet = getStudentContract(studentWalletAddress);

        // Connect employer wallet to provider
        const connectedEmployer = employerWallet.connect(provider);

        // Request employer read permission
        await sendTransaction(connectedEmployer, studentWallet, studentWalletAddress, 'askForPermission', [roleCodes.employerReadRequest], AccountType.Employer);
    } catch (error) {
        logError('Failed to request employer access:', error);
        throw new Error('Failed to request employer access');
    }
}

/**
 * Retrieves employer information from the blockchain.
 * @author Aslak Heimdal
 * @param {string} employerAccountAddress - The employer's smart account address
 * @returns {Promise<Employer>} The employer's information
 * @throws {Error} If employer address is invalid or data retrieval fails
 */
export async function getEmployerInfo(employerAccountAddress: string): Promise<Employer> {
    try {
        if (!employerAccountAddress || !employerAccountAddress.startsWith('0x')) {
            throw new Error('Valid employer account address is required');
        }

        return await getEmployer(employerAccountAddress);
    } catch (error) {
        logError('Failed to retrieve employer information:', error);
        throw new Error('Failed to retrieve employer information');
    }
}

/**
 * Retrieves student academic results for an employer (read-only, no personal information).
 * @author Aslak Heimdal
 * @param {Wallet} employerWallet - The employer wallet with read permissions
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @returns {Promise<AcademicResult[]>} Array of academic results (without personal information)
 * @throws {Error} If employer wallet is missing, student address is invalid, or data retrieval fails
 */
export async function getStudentResultsForEmployer(employerWallet: Wallet, studentWalletAddress: string): Promise<AcademicResult[]> {
    try {
        // Input validation
        if (!employerWallet) {
            throw new Error('Employer wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentAccount = getStudentContract(studentWalletAddress);

        // Connect employer wallet to provider
        const connectedEmployer = employerWallet.connect(provider);

        // Get employer's smart account address
        const employerAccountAddress = await getEmployerAccountAddress(connectedEmployer);

        // Fetch results through employer's smart account (read-only access)
        const results = await executeSmartAccountViewCall(connectedEmployer, studentAccount, studentWalletAddress, 'getResultsForEmployer', [], AccountType.Employer);

        // Process results (similar to generateStudent but without personal info)
        // Get unique universities from results
        const universityAddresses = new Set((results[0] as StudentContract.ResultStructOutput[]).map(r => r.university));
        const universitiesMap = await getUniversities(universityAddresses);

        const processedResults: AcademicResult[] = (results[0] as StudentContract.ResultStructOutput[]).map(result => {
            const university = universitiesMap.get(result.university);
            if (!university) {
                throw new Error(`University not found for address: ${result.university}`);
            }
            
            return {
                code: result.code,
                name: result.name,
                degreeCourse: result.degreeCourse,
                ects: Number(result.ects) / 100,
                university: university,
                grade: result.grade || undefined,
                evaluationDate: result.date ? computeDate(result.date) : undefined,
                certificate: result.certificateHash ? `${ipfsConfig.gatewayUrl}${result.certificateHash}` : undefined,
            };
        });

        return processedResults;
    } catch (error) {
        logError('Failed to retrieve student results for employer:', error);
        throw new Error('Failed to retrieve student results for employer');
    }
}

/**
 * Grants read-only permission to an employer for a student's academic records.
 * @author Aslak Heimdal
 * @param {Wallet} studentWallet - The student wallet (or university wallet acting on behalf of student)
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @param {string} employerAddress - The employer's smart account address
 * @returns {Promise<void>} Promise that resolves when the permission is granted
 * @throws {Error} If student wallet is missing, addresses are invalid, or permission grant fails
 */
export async function grantEmployerPermission(studentWallet: Wallet, studentWalletAddress: string, employerAddress: string): Promise<void> {
    try {
        // Input validation
        if (!studentWallet) {
            throw new Error('Student wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        if (!employerAddress || !employerAddress.startsWith('0x')) {
            throw new Error('Valid employer address is required');
        }

        // Get student contract instance
        const studentAccount = getStudentContract(studentWalletAddress);

        // Connect student wallet to provider
        const connectedStudent = studentWallet.connect(provider);

        // Grant employer permission
        await sendTransaction(connectedStudent, studentAccount, studentWalletAddress, 'grantEmployerPermission', [employerAddress], AccountType.Student);
    } catch (error) {
        logError('Failed to grant employer permission:', error);
        throw new Error('Failed to grant employer permission');
    }
}

/**
 * Revokes permission from an employer to access a student's academic records.
 * @author Aslak Heimdal
 * @param {Wallet} studentWallet - The student wallet
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @param {string} employerAddress - The employer's smart account address
 * @returns {Promise<void>} Promise that resolves when the permission is revoked
 * @throws {Error} If student wallet is missing, addresses are invalid, or permission revocation fails
 */
export async function revokeEmployerPermission(studentWallet: Wallet, studentWalletAddress: string, employerAddress: string): Promise<void> {
    try {
        // Input validation
        if (!studentWallet) {
            throw new Error('Student wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        if (!employerAddress || !employerAddress.startsWith('0x')) {
            throw new Error('Valid employer address is required');
        }

        // Get student contract instance
        const studentAccount = getStudentContract(studentWalletAddress);

        // Connect student wallet to provider
        const connectedStudent = studentWallet.connect(provider);

        // Revoke employer permission
        await sendTransaction(connectedStudent, studentAccount, studentWalletAddress, 'revokeEmployerPermission', [employerAddress], AccountType.Student);
    } catch (error) {
        logError('Failed to revoke employer permission:', error);
        throw new Error('Failed to revoke employer permission');
    }
}

/**
 * Retrieves all employer permissions for a student from the blockchain.
 * @author Aslak Heimdal
 * @param {Wallet} studentWallet - The student wallet
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @param {boolean} requestsOnly - If true, returns only pending requests; if false, returns only granted permissions
 * @returns {Promise<string[]>} Array of employer addresses with the specified permission status
 * @throws {Error} If student wallet is missing, student address is invalid, or data retrieval fails
 */
export async function getEmployerPermissions(studentWallet: Wallet, studentWalletAddress: string, requestsOnly: boolean = false): Promise<string[]> {
    try {
        // Input validation
        if (!studentWallet) {
            throw new Error('Student wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentAccount = getStudentContract(studentWalletAddress);

        // Connect student wallet to provider
        const connectedStudent = studentWallet.connect(provider);

        // Determine permission type
        const permissionType = requestsOnly ? roleCodes.employerReadRequest : roleCodes.employerRead;

        // Fetch permissions
        const [permissions] = await executeSmartAccountViewCall(connectedStudent, studentAccount, studentWalletAddress, 'getEmployerPermissions', [permissionType], AccountType.Student);

        // permissions is already the address[] array from the decoded result
        return permissions as string[];
    } catch (error) {
        logError('Failed to retrieve employer permissions:', error);
        throw new Error('Failed to retrieve employer permissions');
    }
}

/**
 * Verifies an employer's permission level for a student's academic wallet.
 * @author Aslak Heimdal
 * @param {Wallet} employerWallet - The employer wallet to check permissions for
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @returns {Promise<boolean>} True if employer has read permission, false otherwise
 * @throws {Error} If employer wallet is missing, student address is invalid, or permission verification fails
 */
export async function verifyEmployerPermission(employerWallet: Wallet, studentWalletAddress: string): Promise<boolean> {
    try {
        // Input validation
        if (!employerWallet) {
            throw new Error('Employer wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentWallet = getStudentContract(studentWalletAddress);

        // Connect employer wallet to provider
        const connectedEmployer = employerWallet.connect(provider);

        // Check permission level on blockchain
        const [permission] = await executeSmartAccountViewCall(connectedEmployer, studentWallet, studentWalletAddress, 'verifyPermission', [], AccountType.Employer);

        // Check if permission is EMPLOYER_READ_ROLE
        return permission === roleCodes.employerRead;
    } catch (error) {
        logError('Failed to verify employer permission:', error);
        throw new Error('Failed to verify employer permission');
    }
}

/**
 * Verifies a university's permission level for a student's academic wallet.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet to check permissions for
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @returns {Promise<PermissionType | null>} The highest permission level (Read or Write) or null if no permission
 * @throws {Error} If university wallet is missing, student address is invalid, or permission verification fails
 */
export async function verifyPermission(universityWallet: Wallet, studentWalletAddress: string): Promise<PermissionType | null> {
    try {
        // Input validation
        if (!universityWallet) {
            throw new Error('University wallet is required');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        // Get student contract instance
        const studentWallet = getStudentContract(studentWalletAddress);

        // Connect university wallet to provider
        const connectedUniversity = universityWallet.connect(provider);

        // Check permission level on blockchain
        const [permission] = await executeSmartAccountViewCall(connectedUniversity, studentWallet, studentWalletAddress, 'verifyPermission', [], AccountType.University);

        // Map permission code to PermissionType enum
        // Note: Only check for university permissions (Read/Write), not employer permissions
        // A university wallet should never have employer permissions
        if (permission === roleCodes.write) {
            return PermissionType.Write;
        } else if (permission === roleCodes.read) {
            return PermissionType.Read;
        }

        // If no permission, return null
        return null;
    } catch (error) {
        logError('Failed to verify permission:', error);
        throw new Error('Failed to verify permission');
    }
}
