# SDK

## Interfaces

### StudentCredentials

Student authentication and academic wallet information. Contains the credentials required for login and blockchain operations.

```TypeScript
interface StudentEthWalletInfo {
    /** Unique identifier for the student. */
    readonly id: string;
    /** Authentication password. */
    readonly password: string;
    /** Ethereum address associated with the student's smart account. */
    readonly academicWalletAddress: string;
}
```

### StudentData

Student's biographical information. Contains the core information to describe a student.

```TypeScript
interface StudentData {
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
```

### CourseInfo

Detailed course information. Contains descriptive data about a specific course.

```TypeScript
interface CourseInfo{
    /** Unique course code/identifier within the university system. */
    readonly code: string;
    /** Full title of the course. */
    readonly name: string;
    /** Name of the degree program this course belongs to. */
    readonly degreeCourse: string;
    /** European Credit Transfer System credits awarded for completion. */
    readonly ects: number;
}
```

### Evaluation

Assessment details for a completed course.Contains performance metrics and certification data.

```TypeScript
interface Evaluation {
    /** Unique course identifier within the university system. */
    readonly code: string;
    /** Final grade achieved. */
    readonly grade: string;
    /** Date of evaluation in ISO format (YYYY-MM-DD). */
    readonly evaluationDate: string;
    /** Optional digital certificate or transcript file. */
    readonly certificate?: Buffer | string;
}
```

### Student

Student information. Contains the student's biographical information and academic records.

```TypeScript
interface Student {
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
    /** Collection of all academic results earned by the student. */
    readonly results?: AcademicResult[];
}
```

### PermissionType

Represents permission types that can be granted to universities.

```TypeScript
enum PermissionType {
    Read,
    Write,
}
```

## Functions

### registerStudent(universityWallet, student) ⇒ `Promise<StudentCredentials>`

Registers a new student in the academic blockchain system.
Creates both a student EOA and smart account.

**Returns**: `Promise<StudentCredentials>` - The created student credentials and wallet information  
**Throws**: `Error` - If university wallet is missing, student data is incomplete, or registration fails  
**Author**: Diego Da Giau  

| Param | Type | Description |
| --- | --- | --- |
| universityWallet | `Wallet` | The university wallet with registration permissions |
| student | `StudentData` | The student information to register |

### enrollStudent(universityWallet, studentWalletAddress, courses) ⇒ `Promise<void>`

Enrolls a student in one or more academic courses.
Records course enrollments on the student's academic blockchain record, establishing the foundation for future evaluations.

**Returns**: `Promise<void>` - Promise that resolves when all enrollments are successfully recorded  
**Throws**: `Error` - If university wallet is missing, student address is invalid, course data is invalid, or enrollment transaction fails  
**Author**: Diego Da Giau  

| Param | Type | Description |
| --- | --- | --- |
| universityWallet | `Wallet` | The university wallet with enrollment authority |
| studentWalletAddress | `string` | The student's academic wallet address on blockchain |
| courses | `Array<CourseInfo>` | Array of courses to enroll the student in (code, name, degreeCourse, ects) |

### evaluateStudent(universityWallet, studentWalletAddress, evaluations) ⇒ `Promise<void>`

Records academic evaluations for a student's enrolled courses.
Publishes certificates to IPFS when provided and records evaluations on the blockchain.

**Returns**: `Promise<void>` - Promise that resolves when all evaluations are successfully recorded  
**Throws**: `Error` - If university wallet is missing, student address is invalid, evaluation data is invalid, or the evaluation transaction fails  
**Author**: Diego Da Giau  

| Param | Type | Description |
| --- | --- | --- |
| universityWallet | `Wallet` | The university wallet with evaluation permissions |
| studentWalletAddress | `string` | The student's academic wallet address |
| evaluations | `Array<Evaluation>` | Array of academic evaluations to record |

### getStudentInfo(universityWallet, studentWalletAddress) ⇒ `Promise<Student>`

Retrieves basic student information from the blockchain.
Only fetches personal data without academic results.

**Returns**: `Promise<Student>` - The student's basic information  
**Throws**: `Error` - If university wallet is missing, student address is invalid, or data retrieval fails  
**Author**: Diego Da Giau  

| Param | Type | Description |
| --- | --- | --- |
| universityWallet | `Wallet` | The university wallet with read permissions |
| studentWalletAddress | `string` | The student's academic wallet address |

### getStudentWithResult(universityWallet, studentWalletAddress) ⇒ `Promise<Student>`

Retrieves student information including academic results.
Provides a complete academic profile with course outcomes.

**Returns**: `Promise<Student>` - The student's complete information with academic results  
**Throws**: `Error` - If university wallet is missing, student address is invalid, or data retrieval fails  
**Author**: Diego Da Giau  

| Param | Type | Description |
| --- | --- | --- |
| universityWallet | `Wallet` | The university wallet with read permissions |
| studentWalletAddress | `string` | The student's academic wallet address |

### askForPermission(universityWallet, studentWalletAddress, type) ⇒ `Promise<void>`

Requests permission to access a student's academic wallet.
Universities must request access before they can read or modify student records.

**Returns**: `Promise<void>` - Promise that resolves when the permission request is submitted and confirmed  
**Throws**: `Error` - If university wallet is missing, student address is invalid, permission type is invalid, or permission request fails  
**Author**: Diego Da Giau  

| Param | Type | Description |
| --- | --- | --- |
| universityWallet | `Wallet` | The university wallet requesting permission |
| studentWalletAddress | `string` | The student's academic wallet address |
| type | `PermissionType` | Type of permission requested (Read or Write) |

### verifyPermission(universityWallet, studentWalletAddress) ⇒ `Promise<PermissionType|null>`

Verifies a university's permission level for a student's academic wallet.

**Returns**: `Promise<PermissionType|null>` - The highest permission level (Read or Write) or null if no permission  
**Throws**: `Error` - If university wallet is missing, student address is invalid, or permission verification fails  
**Author**: Diego Da Giau  

| Param | Type | Description |
| --- | --- | --- |
| universityWallet | `Wallet` | The university wallet to check permissions for |
| studentWalletAddress | `string` | The student's academic wallet address |
