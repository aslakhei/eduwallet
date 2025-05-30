import type { Wallet } from 'ethers';


/**
 * Core authentication and wallet information for a student.
 * Contains sensitive information that should be handled securely.
 */
export interface StudentEthWalletInfo {
    /** Unique identifier for the student, typically a student ID number. */
    readonly id: string;
    /** Authentication password. */
    readonly password: string;
    /** Ethereum wallet (EOA) instance for blockchain transactions. */
    readonly ethWallet: Wallet;
}

/**
 * Student authentication and academic wallet information.
 * Contains the credentials required for login and blockchain operations.
 */
export interface StudentCredentials extends Omit<StudentEthWalletInfo, "ethWallet"> {
    /** Ethereum address associated with the student's smart account. */
    readonly academicWalletAddress: string;
}

/**
 * Student's biographical information.
 * Contains the core information to describe a student.
 */
export interface StudentData {
    /** Student's first name. */
    readonly name: string;
    /** Student's last name. */
    readonly surname: string;
    /** Student's date of birth in ISO format (YYYY-MM-DD). */
    readonly birthDate: string;
    /** Student's place of birth. */
    readonly birthPlace: string;
    /** Student's country of origin. */
    readonly country: string;
}

/**
 * Student information.
 * Contains the student's biographical information and academic records.
 */
export interface Student extends StudentData {
    /** Collection of all academic results earned by the student. */
    readonly results?: AcademicResult[];
}

/**
 * Unique course identifier.
 * Used as the base for course-related interfaces.
 */
interface CourseId {
    /** Unique course identifier within the university system. */
    readonly code: string;
}

/**
 * Comprehensive academic record for a specific course.
 * Combines course information, evaluation details, and institutional context.
 */
export interface AcademicResult extends CourseInfo, Partial<Omit<Evaluation, "code">> {
    /** University where the course was taken. */
    readonly university: University;
}

/**
 * Detailed course information.
 * Contains descriptive data about a specific course.
 */
export interface CourseInfo extends CourseId {
    /** Full title of the course. */
    readonly name: string;
    /** Name of the degree program this course belongs to. */
    readonly degreeCourse: string;
    /** European Credit Transfer System credits awarded for completion. */
    readonly ects: number;
}

/**
 * Assessment details for a completed course.
 * Contains performance metrics and certification data.
 */
export interface Evaluation extends CourseId {
    /** Final grade achieved. */
    readonly grade: string;
    /** Date of evaluation in ISO format (YYYY-MM-DD). */
    readonly evaluationDate: string;
    /** Optional digital certificate or transcript file. */
    readonly certificate?: Buffer | string;
}

/**
 * Educational institution information.
 * Contains identifying details about a university.
 */
export interface University {
    /** Full official name of the university. */
    readonly name: string;
    /** Country where the university is located. */
    readonly country: string;
    /** Abbreviated name or acronym of the university. */
    readonly shortName: string;
}

/**
 * Represents permission types that can be granted to universities.
 */
export enum PermissionType {
    Read,
    Write,
}
