import { Platform } from "react-native";
import type { Credentials } from "../models/student";
import { StudentModel } from "../models/student";
import type { EmployerCredentials } from "../models/employer";
import { EmployerModel } from "../models/employer";
import type UniversityModel from "../models/university";
import { getRawPermissions, getStudent, getStudentsRegister, getStudentWallet, getEmployerWallet, getEmployerInfo, getUniversity, getEmployer, grantPermission, revokePermission, grantEmployerPermission, revokeEmployerPermission } from "./contractsService";
import { Permission } from "../models/permissions";
import { logError } from "./config";

/**
 * Authenticates an employer and retrieves their information.
 * @param {EmployerCredentials} credentials - The employer's login credentials (private key)
 * @returns {Promise<EmployerModel>} A promise that resolves to the authenticated employer's data
 * @throws {Error} If authentication fails or employer data cannot be retrieved
 */
export async function logInEmployer(credentials: EmployerCredentials): Promise<EmployerModel> {
    try {
        if (!credentials || !credentials.privateKey) {
            throw new Error('Invalid credentials: Missing private key');
        }

        // Create employer wallet from private key
        const employerWallet = getEmployerWallet(credentials);
        const studentsRegister = getStudentsRegister();

        // Get employer's smart contract address
        let contractAddress: string;
        try {
            contractAddress = await studentsRegister
                .connect(employerWallet as any)
                .getEmployerAccount();
        } catch (error: any) {
            // Check if the error is due to employer not being registered
            if (error?.message?.includes('EmployerNotPresent') || 
                error?.message?.includes('execution reverted') ||
                error?.code === 'CALL_EXCEPTION') {
                throw new Error('Employer not registered. Please register this employer account first using the CLI.');
            }
            throw error;
        }
        
        if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Employer contract address not found');
        }

        // Create and populate employer model
        const employer = new EmployerModel("", "", contractAddress, employerWallet);
        await getEmployerInfo(employer);

        return employer;
    } catch (error) {
        logError("Employer login failed: ", error);
        // If it's already a user-friendly error, re-throw it
        if (error instanceof Error && error.message.includes('not registered')) {
            throw error;
        }
        if (`${error}`.includes('EmployerNotPresent') || `${error}`.includes('not registered')) {
            throw new Error('Employer not registered. Please register this employer account first using the CLI.');
        }
        throw new Error('Connection issues. Try again.');
    }
}

/**
 * Authenticates a student and retrieves their information.
 * @param {Credentials} credentials - The student's login credentials (ID and password)
 * @returns {Promise<StudentModel>} A promise that resolves to the authenticated student's data
 * @throws {Error} If authentication fails or student data cannot be retrieved
 */
export async function logIn(credentials: Credentials): Promise<StudentModel> {
    try {
        if (!credentials || !credentials.id || !credentials.password) {
            throw new Error('Invalid credentials: Missing ID or password');
        }

        // Create student wallet from credentials and get contract instance
        const studentWalletPromise = getStudentWallet(credentials);
        const studentsRegister = getStudentsRegister();

        const studentWallet = await studentWalletPromise;
        if (!studentWallet) {
            throw new Error('Failed to create student wallet');
        }

        // Get student's smart contract address
        let contractAddress: string;
        try {
            contractAddress = await studentsRegister
                .connect(studentWallet as any)
                .getStudentAccount();
        } catch (error: any) {
            // Check if the error is due to student not being registered
            if (error?.message?.includes('StudentNotPresent') || 
                error?.message?.includes('execution reverted') ||
                error?.code === 'CALL_EXCEPTION') {
                throw new Error('Student not registered. Please register this student first using the CLI.');
            }
            throw error;
        }
        
        if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error('Student contract address not found');
        }

        // Create and populate student model
        const student = new StudentModel(credentials.id, studentWallet, contractAddress);
        await getStudent(student);

        return student;
    } catch (error) {
        logError("Student login failed: ", error);
        // If it's already a user-friendly error, re-throw it
        if (error instanceof Error && error.message.includes('not registered')) {
            throw error;
        }
        if (`${error}`.includes('StudentNotPresent') || `${error}`.includes('not registered')) {
            throw new Error('Student not registered. Please register this student first using the CLI.');
        }
        throw new Error('Connection issues. Try again.');
    }
}

/**
 * Retrieves all universities associated with a student's academic results.
 * @param {StudentModel} student - The student whose universities need to be retrieved
 * @param {string[]} universitiesAddresses - Ethereum addresses of universities to fetch
 * @returns {Promise<UniversityModel[]>} Array of university models with their details
 * @throws {Error} If universities cannot be retrieved or connection fails
 */
export async function getUniversities(student: StudentModel, universitiesAddresses: string[]): Promise<UniversityModel[]> {
    try {
        if (!student || !student.wallet) {
            throw new Error('Student not properly authenticated');
        }

        if (!universitiesAddresses || universitiesAddresses.length === 0) {
            return [];
        }

        // Create university models with full information
        const universities: UniversityModel[] = [];
        for (let i = 0; i < universitiesAddresses.length; ++i) {
            try {
                const university = await getUniversity(
                    universitiesAddresses[i]
                );
                universities.push(university);
            } catch (universityError) {
                logError(`Failed to fetch university at index ${i}:`, universityError);
            }
        }

        return universities;
    } catch (error) {
        logError('Universities retrieval failed:', error);
        throw new Error('Failed to retrieve universities. Please try again later.');
    }
}

/**
 * Retrieves all permissions for a student from the blockchain.
 * @param {StudentModel} student - The authenticated student model
 * @returns {Promise<Permission[]>} Array of all permissions (both requests and granted)
 * @throws {Error} If permissions cannot be retrieved from the blockchain
 */
export async function getPermissions(student: StudentModel): Promise<Permission[]> {
    try {
        if (!student || !student.wallet) {
            throw new Error('Student not properly authenticated');
        }
        
        return await getRawPermissions(student);
    } catch (error) {
        logError('Failed to fetch permissions:', error);
        throw new Error('Could not retrieve permission information');
    }
}

/**
 * Retrieves all employers associated with a student's permissions.
 * @param {StudentModel} student - The student whose employers need to be retrieved
 * @param {string[]} employerAddresses - Ethereum addresses of employers to fetch
 * @returns {Promise<EmployerModel[]>} Array of employer models with their details
 * @throws {Error} If employers cannot be retrieved or connection fails
 */
export async function getEmployers(student: StudentModel, employerAddresses: string[]): Promise<EmployerModel[]> {
    try {
        if (!student || !student.wallet) {
            throw new Error('Student not properly authenticated');
        }

        if (!employerAddresses || employerAddresses.length === 0) {
            return [];
        }

        // Create employer models with full information
        const employers: EmployerModel[] = [];
        for (let i = 0; i < employerAddresses.length; ++i) {
            try {
                const employer = await getEmployer(
                    employerAddresses[i]
                );
                employers.push(employer);
            } catch (employerError) {
                logError(`Failed to fetch employer at index ${i}:`, employerError);
            }
        }

        return employers;
    } catch (error) {
        logError('Employers retrieval failed:', error);
        throw new Error('Failed to retrieve employers. Please try again later.');
    }
}

/**
 * Performs the appropriate action on a permission based on its type.
 * For permission requests, grants the permission.
 * For existing permissions, revokes the permission.
 * @param {StudentModel} student - The authenticated student model
 * @param {Permission} permission - The permission to process
 * @returns {Promise<void>}
 * @throws {Error} If permission action cannot be performed
 */
export async function performAction(student: StudentModel, permission: Permission): Promise<void> {
    try {
        console.log('performAction called:', { 
            studentId: student?.id, 
            hasWallet: !!student?.wallet,
            permission: permission 
        });
        
        if (!student || !student.wallet) {
            throw new Error('Student not properly authenticated');
        }
        
        if (!permission) {
            throw new Error('Permission object is required');
        }
        
        if (!permission || !permission.address) {
            throw new Error('Address is missing in permission');
        }
        
        // Handle employer permissions
        if (permission.isEmployer) {
            console.log('Handling employer permission:', permission.request ? 'grant' : 'revoke');
            if (permission.request) {
                // Grant employer permission (approve request)
                return await grantEmployerPermission(student, permission.address);
            } else {
                // Revoke employer permission
                return await revokeEmployerPermission(student, permission.address);
            }
        }
        
        // Handle university permissions
        console.log('Handling university permission:', permission.request ? 'grant' : 'revoke');
        if (permission.request) {
            return await grantPermission(student, permission);
        }
        return await revokePermission(student, permission.address);
    } catch (error: any) {
        console.error('performAction error:', error);
        logError('Failed to perform permission action:', error);
        // Preserve the original error message if it's user-friendly
        if (error instanceof Error && error.message) {
            throw error;
        }
        const action = permission?.request ? 'grant' : 'revoke';
        throw new Error(error?.message || `Could not ${action} permission. Please try again later.`);
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
            throw new Error('Employer not properly authenticated');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        const { requestEmployerAccess } = await import('./contractsService');
        await requestEmployerAccess(employer, studentWalletAddress);
    } catch (error: any) {
        logError('Failed to request employer access:', error);
        // Preserve the original error message if it's user-friendly
        if (error instanceof Error && error.message) {
            throw error;
        }
        throw new Error(error?.message || 'Could not request access to student records. Please try again later.');
    }
}

/**
 * Gets all students who have granted access to this employer.
 * Checks stored student addresses and verifies access.
 * @param {EmployerModel} employer - The authenticated employer model
 * @returns {Promise<Array<{address: string, hasAccess: boolean, results?: any[]}>>} Array of students with access
 */
export async function getStudentsWithAccess(employer: EmployerModel): Promise<Array<{address: string, hasAccess: boolean, results?: any[]}>> {
    try {
        if (!employer || !employer.accountAddress) {
            return [];
        }

        // Get stored student addresses (from AsyncStorage in React Native, localStorage in web)
        const key = `employer_students_${employer.accountAddress}`;
        let storedAddresses: string[] = [];
        
        if (Platform.OS === 'web') {
            const stored = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
            storedAddresses = stored ? JSON.parse(stored) : [];
        } else {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const stored = await AsyncStorage.getItem(key);
            storedAddresses = stored ? JSON.parse(stored) : [];
        }

        if (storedAddresses.length === 0) {
            return [];
        }

        // Check access for each stored address
        const studentsWithAccess = await Promise.all(
            storedAddresses.map(async (address: string) => {
                try {
                    const results = await getStudentResultsForEmployer(employer, address);
                    return {
                        address: address,
                        hasAccess: true,
                        results: results,
                    };
                } catch (error: any) {
                    // If access check fails, they might have revoked access
                    return {
                        address: address,
                        hasAccess: false,
                    };
                }
            })
        );

        // Filter out students without access and return
        return studentsWithAccess.filter(s => s.hasAccess);
    } catch (error) {
        logError('Failed to get students with access:', error);
        return [];
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
        if (!employer || !employer.wallet) {
            throw new Error('Employer not properly authenticated');
        }

        if (!studentWalletAddress || !studentWalletAddress.startsWith('0x')) {
            throw new Error('Valid student wallet address is required');
        }

        const { getStudentResultsForEmployer } = await import('./contractsService');
        return await getStudentResultsForEmployer(employer, studentWalletAddress);
    } catch (error) {
        logError('Failed to retrieve student results for employer:', error);
        throw new Error('Could not retrieve student results. Please try again later.');
    }
}

