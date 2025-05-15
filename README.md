# EduWallet

## Table of contents

- [EduWallet](#eduwallet)
  - [Table of contents](#table-of-contents)
  - [Purpose](#purpose)
  - [Scenarios](#scenarios)
    - [Scenario 1](#scenario-1)
    - [Scenario 2](#scenario-2)
  - [Requirements](#requirements)
    - [Functional Requirements](#functional-requirements)
    - [Non-Functional Requirements](#non-functional-requirements)
    - [Constraints and assumptions](#constraints-and-assumptions)
  - [GUI prototype](#gui-prototype)

## Purpose

The project aims to revolutionize university credit management by storing students' academic information on the blockchain. Through EduWallet APIs, universities can easily synchronize grades and credits, simplifying the transfer of academic records between institutions. EduWallet ensures secure, efficient record-keeping and easy credit transferability across institutions.

## Scenarios

### Scenario 1

**Title:** Exchange Student Academic Certification with EduWallet

**Actors:**

- **Student**: Participates to an exchange project (ex. Erasmus+ project). At the beginning of the project she must send to the host university her previous academic career. At the end of the project she has to certificate her results at the host university with her home university.
- **Home university**: When the project starts it provides the student with the data about her career. At the end, it needs her academic results (grades and credits).
- **Host university**: When the project starts it needs the student's data and her career. During the project it evaluates the student's performances, providing grades and credits. At the end, it certificates the results.

**Preconditions:**

- The students apply for the first time in a university.
- Both universities are registered and authorized entities in the EduWallet system.

**Scenario**:

1. The home university approves the student's enrolment request and create an EduWallet for her, inserting the student's validated data. The first university has by default the permission to write and read the student's wallet.
2. During the student's career, her home university records grades and credits on EduWallet.
3. The student decides to participate in an exchange program. The host university requests the permission to access her EduWallet data.
4. The student grants the permissions to the host university.
5. The host university retrieves the student's academic records and approve her exchange request.
6. The host university asks the student for the permission to modify her data.
7. The student grants the writing access.
8. During the exchange program, the host university records the student's academic performance, including grades and credits, on EduWallet.
9. At the end of the program, the student removes the host university's access to her EduWallet data.
10. The home university retrieves the student’s academic results from the host university via EduWallet.

**Postconditions:**

- The student has all her academic result recorded in EduWallet.
- The home university can automatically retrieve the student's data from EduWallet.
- The student's data in EduWallet are verified and certified by both the home and host university.

### Scenario 2

**Title:** Job interview

**Actors:**

- **Employer**: Searches for a worker with specific skills and a verified academic background.
- **Candidate**:  Applies for a job and needs to demonstrate her academic qualifications.

**Preconditions:**

- The candidate and the university she attended are registered and authorized in EduWallet.
- The candidate's academic record, including grades, certifications, and degrees, are securely stored in EduWallet.

**Scenario**:

1. The employer requests the candidate's academic background during the job application process.
2. The candidate logs into her EduWallet account and retrieves her academic data from the blockchain.
3. The candidate grants the employer temporary access to her EduWallet academic results.

**Postconditions:**

- The employer has verified and certified access to the candidate's academic records through EduWallet.
- The candidate academic data are certified, secure and immutable without authorization.
- The permission granted to the employer expires.

## Requirements

### Functional Requirements

**System administration**:

- **FR1**: Allow the system administrator to verify and approve universities requesting access to the system.

**University**:

- **FR2**: Enable universities to register and subscribe to the system.
- **FR3**: Provide secure authentication mechanisms for universities to access the platform.
- **FR4**: Allow universities to create new smart contract wallets for students upon enrolment.
- **FR5**: Enable universities to read from and issue academic records to students' smart wallets.
- **FR6**: Implement authorization controls to ensure that only permitted universities can access or modify specific academic records.
- **FR7**: Provide a mechanism for universities to request and obtain permission from students before accessing or modifying their academic records.
- **FR8**: Provide APIs that allow universities to integrate the system with their existing LMS.

**Student**:

- **FR9**: Students must own and manage their academic smart wallets independently.
- **FR10**: Enable students to securely authenticate and access their smart wallets.
- **FR11**: Provide students with a web-based interface to view and manage their academic records.
- **FR12**: Allow students to grant and revoke access permissions to their academic records for specific institutions.

### Non-Functional Requirements

- **NFR1**: The system shall operate without dependency on third-party wallet providers such as MetaMask.
- **NFR2**: The system shall minimize reliance on third-party technologies to enhance security and maintain control.
- **NFR3**: On-chain storage costs shall be minimized by storing only essential data, excluding large files.
- **NFR4**: Academic records shall be tamper-proof and verifiable by authorized third parties.
- **NFR5**: The system shall provide an intuitive and user-friendly interface for both students and university administrators.
- **NFR6**: The system architecture shall be designed to maximize decentralization wherever feasible.

### Constraints and assumptions

- User authentication is not the primary focus; a basic, easily replaceable mechanism is sufficient.
- The authentication method should allow for future upgrades.
- All on-chain operations must stay within acceptable gas limits.
- Universities are assumed to have a basic understanding of blockchain concepts.

## GUI prototype

[Figma GUI prototype](https://www.figma.com/design/aZrmR2thWfRGKQWDQbZE9C/EduWallet?node-id=125-95&t=gQwA5a4uDzRy8jBl-1)
