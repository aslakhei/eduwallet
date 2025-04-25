import { NonceManager } from "ethers";
import { type ContractTransactionResponse, type Wallet } from "ethers";
import type { CourseInfo, Evaluation, Student, StudentCredentials, StudentData } from "./types";
import { PermissionType } from "./types";
import { computeDate, createStudentWallet, generateStudent, getStudentContract, getStudentsRegister, publishCertificate } from "./utils";
import { logError, provider, roleCodes } from "./conf";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import type { Student as StudentContract } from '@typechain/contracts/Student';

/**
 * Re-export types for SDK consumers
 */
export type { StudentCredentials, StudentData, CourseInfo, Evaluation, Student };
export { PermissionType };
export { getStudentsRegister };

// Configure dayjs to use UTC for consistent date handling across timezones
dayjs.extend(utc);

/**
 * Registers a new student in the academic blockchain system.
 * Creates both a student Ethereum wallet and academic record.
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

        // Get contract instance
        const studentsRegister = getStudentsRegister();

        // Create a new Ethereum wallet for the student
        const studentEthWallet = createStudentWallet();

        // Connect university wallet to provider
        const connectedUniversity = universityWallet.connect(provider);

        // Format student data for the contract
        const basicInfo: StudentContract.StudentBasicInfoStruct = {
            name: student.name,
            surname: student.surname,
            birthDate: dayjs.utc(student.birthDate).unix(),
            birthPlace: student.birthPlace,
            country: student.country
        }

        // Register student on the blockchain
        const registerTx = await studentsRegister.connect(connectedUniversity).registerStudent(
            studentEthWallet.ethWallet.address,
            basicInfo
        );
        await registerTx.wait();

        // Get the academic wallet address created for the student
        const studentAcademicWalletAddress = await studentsRegister.connect(universityWallet).getStudentWallet(studentEthWallet.ethWallet.address);

        // Validate the returned address
        if (!studentAcademicWalletAddress || !studentAcademicWalletAddress.startsWith('0x')) {
            throw new Error('Invalid student academic wallet address returned');
        }

        // Return complete student credentials
        return {
            id: studentEthWallet.id,
            password: studentEthWallet.password,
            academicWalletAddress: studentAcademicWalletAddress,
            ethWallet: studentEthWallet.ethWallet,
        }
    } catch (error) {
        logError('Failed to register student:', error)
        throw new Error('Failed to register student');
    }
}

/**
 * Enrolls a student in one or more academic courses.
 * Adds course records to the student's academic wallet.
 * Both transaction submission and confirmation are processed in parallel for maximum efficiency.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet with enrollment permissions
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @param {CourseInfo[]} courses - Array of courses to enroll the student in
 * @returns {Promise<{course: CourseInfo, error: Error}[]>} Array of failed enrollments with their errors. Returns an empty array if all enrollments succeeded.
 * @throws {Error} If university wallet is missing, student address is invalid, course data is missing/invalid, or the entire enrollment process fails
 */
export async function enrollStudent(universityWallet: Wallet, studentWalletAddress: string, courses: CourseInfo[]): Promise<{ course: CourseInfo, error: Error }[]> {
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
        const connectedUniversity = new NonceManager(universityWallet.connect(provider));

        // Array to track enrollment transactions with their corresponding course data
        const enrollmentPromises: { tx: Promise<ContractTransactionResponse>, course: CourseInfo }[] = [];

        // Array to collect failed transactions
        const failed: { course: CourseInfo, error: Error }[] = [];

        // Submit all enrollment transactions in parallel
        for (const course of courses) {
            try {
                // Create transaction promise and track it with its course data
                const tx = studentWallet.connect(connectedUniversity).enroll(
                    course.code,
                    course.name,
                    course.degreeCourse,
                    BigInt(course.ects * 100)
                );
                enrollmentPromises.push({ tx, course });
            } catch (courseError: any) {
                logError(`Failed to submit transaction for course ${course.code}:`, courseError);
                failed.push({
                    course,
                    error: courseError,
                });
            }
        }

        // Process all transactions in parallel - wait for submission and confirmation
        const confirmationPromises = enrollmentPromises.map(t =>
            t.tx.then(x => {
                // Wait for blockchain confirmation
                x.wait().catch(confError => {
                    logError(`Confirmation failed for course ${t.course.code}:`, confError);
                    failed.push({ course: t.course, error: confError });
                })
            }).catch(promiseError => {
                logError(`Transaction failed for course ${t.course.code}:`, promiseError);
                failed.push({ course: t.course, error: promiseError });
            }));

        // Wait for all transaction processes to complete
        await Promise.allSettled(confirmationPromises);

        // Return the list of failed enrollments (empty if all succeeded)
        return failed;
    } catch (error) {
        logError('Enrollment process failed:', error);
        throw new Error('Student enrollment failed');
    }
}

/**
 * Records academic evaluations for a student's enrolled courses.
 * Publishes certificates to IPFS when provided and records evaluations on the blockchain.
 * Both transaction submission and confirmation are processed in parallel for maximum efficiency.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet with evaluation permissions
 * @param {string} studentWalletAddress - The student's academic wallet address
 * @param {Evaluation[]} evaluations - Array of academic evaluations to record
 * @returns {Promise<{evaluation: Evaluation, error: Error}[]>} Array of failed evaluations with their errors. Returns an empty array if all evaluations were successfully recorded.
 * @throws {Error} If university wallet is missing, student address is invalid, evaluation data is missing/invalid, or the entire evaluation process fails
 * 
 * TODO: manage certificate publishing. Now it is sequential, better parallel.
 */
export async function evaluateStudent(universityWallet: Wallet, studentWalletAddress: string, evaluations: Evaluation[]): Promise<{ evaluation: Evaluation, error: Error }[]> {
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
        });

        // Get student contract instance
        const studentWallet = getStudentContract(studentWalletAddress);

        // Connect university wallet to provider with NonceManager
        // The NonceManager wrapper handles transaction nonce tracking automatically, allowing multiple concurrent transactions without nonce conflicts
        const connectedUniversity = new NonceManager(universityWallet.connect(provider));

        // Array to track evaluation transactions with their corresponding data
        const evaluationPromises: { tx: Promise<ContractTransactionResponse>, evaluation: Evaluation }[] = [];

        // Array to collect failed transactions
        const failed: { evaluation: Evaluation, error: Error }[] = [];

        for (const evaluation of evaluations) {
            try {
                // Publish certificate to IPFS if provided
                let certificate = '';
                if (evaluation.certificate) {
                    try {
                        certificate = await publishCertificate(evaluation.certificate);
                    } catch (certError: any) {
                        logError(`Failed to publish certificate for course ${evaluation.code}:`, certError);
                        failed.push({
                            evaluation,
                            error: certError,
                        });
                        // Skip this evaluation and move to the next one
                        continue;
                    }
                }

                // Record evaluation on the blockchain
                const tx = studentWallet.connect(connectedUniversity).evaluate(
                    evaluation.code,
                    evaluation.grade,
                    dayjs.utc(evaluation.evaluationDate).unix(),
                    certificate
                );
                evaluationPromises.push({ tx, evaluation });
            } catch (evalError: any) {
                logError(`Failed to submit transaction for evaluation of course ${evaluation.code}:`, evalError);
                failed.push({
                    evaluation,
                    error: evalError,
                });
            }
        }

        // Process all transactions in parallel - wait for submission and confirmation
        const confirmationPromises = evaluationPromises.map(t =>
            t.tx.then(x => {
                // Wait for blockchain confirmation
                x.wait().catch(confError => {
                    logError(`Confirmation failed for course ${t.evaluation.code}:`, confError);
                    failed.push({ evaluation: t.evaluation, error: confError });
                })
            }).catch(promiseError => {
                logError(`Transaction failed for evaluation of course ${t.evaluation.code}:`, promiseError);
                failed.push({ evaluation: t.evaluation, error: promiseError });
            }))

        // Wait for all transaction processes to complete
        await Promise.allSettled(confirmationPromises);

        // Return the list of failed enrollments (empty if all succeeded)
        return failed;
    } catch (error) {
        logError('Evaluation process failed:', error);
        throw new Error('Student evaluation failed');
    }
}

/**
 * Retrieves basic student information from the blockchain.
 * Only fetches personal data without academic results.
 * @author Diego Da Giau
 * @param {Wallet} universityWallet - The university wallet with read permissions
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

        // Connect university wallet to provider
        const connectedUniversity = universityWallet.connect(provider);

        // Fetch student's basic information
        const student = await studentWallet.connect(connectedUniversity).getStudentBasicInfo();

        // Validate retrieved data
        if (!student || !student.name) {
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
        const studentWallet = getStudentContract(studentWalletAddress);

        // Connect university wallet to provider
        const connectedUniversity = universityWallet.connect(provider);

        // Fetch student data and results in parallel for efficiency
        const [student, results] = await Promise.all([
            studentWallet.connect(connectedUniversity).getStudentBasicInfo(),
            studentWallet.connect(connectedUniversity).getResults(),
        ]);

        // Validate retrieved data
        if (!student) {
            throw new Error('Received invalid or empty student data');
        }

        // Generate complete student object with processed results
        return await generateStudent(connectedUniversity, student, results);
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

        // Submit permission request transaction
        const tx = await studentWallet.connect(connectedUniversity).askForPermission(permission);
        // Wait for transaction confirmation
        await tx.wait();
    } catch (error) {
        console.error('Failed to request permission:', error);
        throw new Error('Failed to request permission');
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
        const permission = await studentWallet.connect(connectedUniversity).verifyPermission();

        // Check permission level on blockchain
        if (permission === roleCodes.read) {
            return PermissionType.Read;
        } else if (permission === roleCodes.write) {
            return PermissionType.Write;
        }

        // If no permission, return null
        return null;
    } catch (error) {
        console.error('Failed to verify permission:', error);
        throw new Error('Failed to verify permission');
    }
}
