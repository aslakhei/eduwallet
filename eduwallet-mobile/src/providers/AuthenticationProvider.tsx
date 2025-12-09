import { createContext, useContext, useState, ReactNode } from "react";
import { Credentials, StudentModel } from "../models/student";
import { EmployerCredentials, EmployerModel } from "../models/employer";
import { useRouter } from "expo-router";
import { logIn, logInEmployer } from "../services/API";
import { getStudent, getEmployerInfo } from "../services/contractsService";
import { useMessages, MessageType } from "./MessagesProvider";

/**
 * User type enum to distinguish between students and employers.
 */
export enum UserType {
    Student = "student",
    Employer = "employer",
    None = "none",
}

/**
 * Interface defining the shape of the AuthenticationContext.
 * Provides access to authenticated user data (student or employer) and login methods.
 */
interface AuthenticationContextProps {
    /** Currently authenticated student model (empty if employer is logged in) */
    student: StudentModel;
    /** Currently authenticated employer model (empty if student is logged in) */
    employer: EmployerModel;
    /** Current user type */
    userType: UserType;
    /** Function to authenticate a student with credentials */
    login(credentials: Credentials): Promise<void>;
    /** Function to authenticate an employer with credentials */
    loginEmployer(credentials: EmployerCredentials): Promise<void>;
    /** Function to log out the current user */
    logout(): void;
    /** Function to refresh student data from the blockchain */
    refreshStudent(): Promise<void>;
    /** Function to refresh employer data from the blockchain */
    refreshEmployer(): Promise<void>;
}

/**
 * Context that provides authentication data throughout the application.
 * Default values are used before the provider is initialized.
 */
const AuthContext = createContext<AuthenticationContextProps>({
    student: StudentModel.createEmpty(),
    employer: EmployerModel.createEmpty(),
    userType: UserType.None,
    login: () => Promise.resolve(),
    loginEmployer: () => Promise.resolve(),
    logout: () => {},
    refreshStudent: () => Promise.resolve(),
    refreshEmployer: () => Promise.resolve(),
});

/**
 * Hook to access the authentication context.
 * @returns {AuthenticationContextProps} The authentication context
 */
export function useAuth(): AuthenticationContextProps {
    return useContext(AuthContext);
}

/**
 * AuthenticationProvider component that provides authentication context to its children.
 * @param {Object} props - The props object.
 * @param {ReactNode} props.children - The child components that will have access to the authentication context.
 * @returns {JSX.Element} The AuthContext provider with the authentication state and functions.
 */
export default function AuthenticationProvider({ children }: { children: ReactNode }) {
    // State for storing the authenticated user
    const [student, setStudent] = useState<StudentModel>(StudentModel.createEmpty());
    const [employer, setEmployer] = useState<EmployerModel>(EmployerModel.createEmpty());
    const [userType, setUserType] = useState<UserType>(UserType.None);
    const router = useRouter();
    const { showMessage } = useMessages();

    /**
     * Authenticates a student using the provided credentials.
     * Updates the student state and redirects to the home page on success.
     * @param {Credentials} credentials - The student's login credentials
     * @returns {Promise<void>} Promise that resolves when authentication is complete
     * @throws {Error} If authentication fails
     */
    const login = async (credentials: Credentials): Promise<void> => {
        try {
            // Attempt to authenticate with provided credentials
            const studentTemp = await logIn(credentials);

            // Update authenticated student state and clear employer
            setStudent(studentTemp);
            setEmployer(EmployerModel.createEmpty());
            setUserType(UserType.Student);

            // Redirect to main app on successful login
            router.replace("/" as any);
        } catch (err: any) {
            showMessage(err.message || "Login failed", MessageType.Error);
            throw err;
        }
    };

    /**
     * Authenticates an employer using the provided credentials.
     * Updates the employer state and redirects to the employer home page on success.
     * @param {EmployerCredentials} credentials - The employer's login credentials (private key)
     * @returns {Promise<void>} Promise that resolves when authentication is complete
     * @throws {Error} If authentication fails
     */
    const loginEmployer = async (credentials: EmployerCredentials): Promise<void> => {
        try {
            // Attempt to authenticate with provided credentials
            const employerTemp = await logInEmployer(credentials);

            // Update authenticated employer state and clear student
            setEmployer(employerTemp);
            setStudent(StudentModel.createEmpty());
            setUserType(UserType.Employer);

            // Redirect to employer home page on successful login
            router.replace("/(employer)" as any);
        } catch (err: any) {
            showMessage(err.message || "Login failed", MessageType.Error);
            throw err;
        }
    };

    /**
     * Logs out the current user and clears the authentication state.
     */
    const logout = (): void => {
        setStudent(StudentModel.createEmpty());
        setEmployer(EmployerModel.createEmpty());
        setUserType(UserType.None);
        router.replace("/(auth)/login");
    };

    /**
     * Refreshes student data from the blockchain.
     * Updates the student's results and information without requiring re-authentication.
     */
    const refreshStudent = async (): Promise<void> => {
        if (!student || !student.id || !student.wallet) {
            return;
        }

        try {
            await getStudent(student);
            // Create a new StudentModel instance to preserve methods and trigger re-render
            // Since getStudent mutates the student object, we create a new instance with updated data
            const refreshedStudent = new StudentModel(
                student.id,
                student.wallet,
                student.accountAddress
            );
            refreshedStudent.name = student.name;
            refreshedStudent.surname = student.surname;
            refreshedStudent.birthDate = student.birthDate;
            refreshedStudent.birthPlace = student.birthPlace;
            refreshedStudent.country = student.country;
            refreshedStudent.updateResults(student.getResults());
            setStudent(refreshedStudent);
        } catch (error) {
            console.error("Failed to refresh student data:", error);
            throw error;
        }
    };

    /**
     * Refreshes employer data from the blockchain.
     * Updates the employer's information without requiring re-authentication.
     */
    const refreshEmployer = async (): Promise<void> => {
        if (!employer || !employer.accountAddress || !employer.wallet) {
            return;
        }

        try {
            await getEmployerInfo(employer);
            // Create a new EmployerModel instance to preserve methods and trigger re-render
            const refreshedEmployer = new EmployerModel(
                employer.companyName,
                employer.country,
                employer.accountAddress,
                employer.wallet,
                employer.contactInfo
            );
            setEmployer(refreshedEmployer);
        } catch (error) {
            console.error("Failed to refresh employer data:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ student, employer, userType, login, loginEmployer, logout, refreshStudent, refreshEmployer }}>
            {children}
        </AuthContext.Provider>
    );
}

