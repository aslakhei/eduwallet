/**
 * Represents permission types that can be granted to universities and employers.
 */
export enum PermissionType {
    Read,
    Write,
    EmployerRead,
}

/**
 * Represents a permission granted to a university or employer.
 */
export interface Permission {
    /** Ethereum address of the university or employer to which the permission applies */
    address: string;
    /** Type of permission granted (Read, Write, or EmployerRead) */
    type: PermissionType;
    /** Indicates if this is a pending request (true) or an approved permission (false) */
    request: boolean;
    /** Indicates if this permission is for an employer (true) or university (false) */
    isEmployer?: boolean;
}

