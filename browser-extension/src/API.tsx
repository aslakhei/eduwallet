import type { Credentials } from "./models/student";
import { StudentModel } from "./models/student";
import type UniversityModel from "./models/university";
import { getRawPermissions, getStudent, getStudentsRegister, getStudentWallet, getUniversity, grantPermission, revokePermission } from "./utils/contractsUtils";
import { Permission } from "./models/permissions";
import { logError } from "./utils/conf";

/**
 * Authenticates a student and retrieves their information.
 * @author Diego Da Giau
 * @param {Credentials} credentials - The student's login credentials (ID and password)
 * @returns {Promise<StudentModel>} A promise that resolves to the authenticated student's data
 * @throws {Error} If authentication fails or student data cannot be retrieved
 */
export async function logIn(credentials: Credentials): Promise<StudentModel> {
    try {
        if (!credentials || !credentials.id || !credentials.password) {
            throw new Error('Invalid credentials: Missing ID or password');
        }

        // Get contract instance and create student wallet
        const studentWalletPromise = getStudentWallet(credentials);
        const studentsRegister = getStudentsRegister();

        const studentWallet = await studentWalletPromise;
        if (!studentWallet) {
            throw new Error('Failed to create student wallet');
        }

        // Get student's smart contract address
        const contractAddress = await studentsRegister
            .connect(studentWallet)
            .getStudentAccount();
        
        if (!contractAddress) {
            throw new Error('Student contract address not found');
        }

        // Create and populate student model
        const student = new StudentModel(credentials.id, studentWallet, contractAddress);
        await getStudent(student);

        return student;
    } catch (error) {
        logError("Student login failed: ", error);
        if (`${error}`.includes('StudentNotPresent')) {
            throw new Error('Authentication failed. Check your credentials.')
        }
        throw new Error('Connection issues. Try again.');
    }
}

/**
 * Retrieves all universities associated with a student's academic results.
 * @author Diego Da Giau
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
 * @author Diego Da Giau
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
 * Performs the appropriate action on a permission based on its type.
 * For permission requests, grants the permission.
 * For existing permissions, revokes the permission.
 * @author Diego Da Giau
 * @param {StudentModel} student - The authenticated student model
 * @param {Permission} permission - The permission to process
 * @returns {Promise<void>}
 * @throws {Error} If permission action cannot be performed
 */
export async function performAction(student: StudentModel, permission: Permission): Promise<void> {
    try {
        if (!student || !student.wallet) {
            throw new Error('Student not properly authenticated');
        }
        
        if (!permission) {
            throw new Error('Permission object is required');
        }
        
        if (!permission.university) {
            throw new Error('University address is missing in permission');
        }
        
        if (permission.request) {
            return await grantPermission(student, permission);
        }
        return await revokePermission(student, permission.university);
    } catch (error) {
        logError('Failed to perform permission action:', error);
        const action = permission?.request ? 'grant' : 'revoke';
        throw new Error(`Could not ${action} permission. Please try again later.`);
    }
}
