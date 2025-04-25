// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import {SmartAccount} from "./SmartAccount.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

// Custom errors for better clarity
error UnauthorizedReading();
error UnauthorizedWriting();
error NotExistingRecord();
error WrongRole();
error PermissionAlreadyGiven();

/**
 * @title Student Smart Contract
 * @author Diego Da Giau
 * @notice Manages a student's academic records and university permissions
 * @dev Implements role-based access control for universities to manage student records
 *
 * TODO: Add input validation. Add events if necessary. Change require with if statements, revert and custom errors. See library for the validation part.
 * ? Enroll and Evaluate with an array of struct as parameter?
 * ? Why students have a different function than universities to fetch information?
 */
contract Student is SmartAccount, AccessControlEnumerable {
    // Role definitions for access control
    bytes32 private constant READER_ROLE = keccak256("READER_ROLE");
    bytes32 private constant WRITER_ROLE = keccak256("WRITER_ROLE");

    // Role definition for access requests control
    bytes32 private constant READER_APPLICANT = keccak256("READER_APPLICANT");
    bytes32 private constant WRITER_APPLICANT = keccak256("WRITER_APPLICANT");

    /**
     * @dev Represents an academic result/course enrollment
     * @param code Course code
     * @param name Course name
     * @param university Address of the university that created the record
     * @param degreeCourse Name of the degree program
     * @param ects ECTS credits for the course (original value multiplied by 100 to work with integer numbers)
     * @param grade Final grade (empty if not evaluated)
     * @param date Date when the grade was assigned
     * @param certificateHash CID of the IPFS file representing the certificate
     */
    struct Result {
        string code;
        string name;
        address university;
        string degreeCourse;
        uint16 ects;
        string grade;
        uint date;
        string certificateHash;
    }

    /**
     * @dev Structure containing student's basic personal information
     * @param name Student's first name
     * @param surname Student's last name
     * @param birthDate Unix timestamp of student's birth date
     * @param birthPlace Student's place of birth
     * @param country Student's country of birth
     */
    struct StudentBasicInfo {
        string name;
        string surname;
        uint birthDate;
        string birthPlace;
        string country;
    }

    /**
     * @dev Structure containing complete student information
     * @param basicInfo Student's personal information
     * @param results Array of all academic results
     */
    struct StudentInfo {
        StudentBasicInfo basicInfo;
        Result[] results;
    }

    // Student's information
    StudentInfo private studentInfo;

    /**
     * @notice Creates a new Student contract with initial data
     * @dev Initializes student information and grants initial roles
     * @param _university Initial university address to receive WRITER_ROLE
     * @param _student Student's address to receive DEFAULT_ADMIN_ROLE
     * @param _basicInfo Struct containing core biographical student's info
     * @param _entryPoint EntryPoint contract address used by the account abstraction layer
     */
    constructor(
        address _university,
        address _student,
        StudentBasicInfo memory _basicInfo,
        IEntryPoint _entryPoint
    ) SmartAccount(_entryPoint, _student) {
        studentInfo.basicInfo = _basicInfo;

        // Set the student as admin of the wallet
        _grantRole(DEFAULT_ADMIN_ROLE, _student);
        // Give to the university the permissions to write
        _grantRole(WRITER_ROLE, _university);
    }

    /**
     * @notice Gets complete student information including academic records
     * @dev Only accessible by addresses with DEFAULT_ADMIN_ROLE
     * @return Complete student information structure
     */
    function getStudentInfo()
        external
        view
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (StudentInfo memory)
    {
        return studentInfo;
    }

    /**
     * @notice Gets student's basic information without academic records
     * @dev Accessible by anyone (public information)
     * @return Basic student information structure
     */
    function getStudentBasicInfo()
        external
        view
        returns (StudentBasicInfo memory)
    {
        return studentInfo.basicInfo;
    }

    /**
     * @notice Gets all academic results
     * @dev Only accessible by addresses with READER_ROLE or WRITER_ROLE
     * @return Array of academic results
     */
    function getResults() external view returns (Result[] memory) {
        // Access control
        require(
            hasRole(READER_ROLE, _msgSender()) ||
                hasRole(WRITER_ROLE, _msgSender()),
            AccessControlUnauthorizedAccount(_msgSender(), READER_ROLE)
        );

        return studentInfo.results;
    }

    /**
     * @notice Registers a new course enrollment
     * @dev Only callable by universities with WRITER_ROLE
     * @param _code Course unique identifier
     * @param _name Course full name
     * @param _degreeCourse Degree program name
     * @param _ects Course ECTS credits number (original value multiplied by 100 to work with integer numbers)
     */
    function enroll(
        string calldata _code,
        string calldata _name,
        string calldata _degreeCourse,
        uint16 _ects
    ) external onlyRole(WRITER_ROLE) {
        Result memory r = Result(
            _code,
            _name,
            _msgSender(),
            _degreeCourse,
            _ects,
            "",
            0,
            ""
        );
        studentInfo.results.push(r);
    }

    /**
     * @notice Records a grade for an enrolled course
     * @dev Only the university that created the enrollment can grade it
     * @param _code Course identifier to evaluate
     * @param _grade Grade to assign
     * @param _date Unix timestamp of evaluation
     * @param _certificateHash CID of the certificate stored on IPFS
     */
    function evaluate(
        string calldata _code,
        string calldata _grade,
        uint _date,
        string calldata _certificateHash
    ) external onlyRole(WRITER_ROLE) {
        // Find the right course to evaluate
        for (uint i; i < studentInfo.results.length; ++i) {
            // Different universities may use the same code. Check also the university's name
            if (
                keccak256(bytes(studentInfo.results[i].code)) ==
                keccak256(bytes(_code)) &&
                studentInfo.results[i].university == _msgSender()
            ) {
                studentInfo.results[i].grade = _grade;
                studentInfo.results[i].date = _date;
                studentInfo.results[i].certificateHash = _certificateHash;
                return;
            }
        }
        revert NotExistingRecord();
    }

    /**
     * @notice Allows a university to request permission to access student data
     * @dev University addresses will be added to READER_APPLICANT or WRITER_APPLICANT roles
     * @param _permissionType Permission type requested (READER_APPLICANT or WRITER_APPLICANT)
     */
    function askForPermission(bytes32 _permissionType) external {
        // Validate permission type
        if (
            _permissionType != READER_APPLICANT &&
            _permissionType != WRITER_APPLICANT
        ) {
            revert WrongRole();
        }

        // Check if already has the same or higher permission
        if (
            (_permissionType == READER_APPLICANT &&
                hasRole(READER_ROLE, _msgSender())) ||
            (hasRole(WRITER_ROLE, _msgSender()))
        ) {
            revert PermissionAlreadyGiven();
        }

        // Check if already applied for same or higher permission
        if (
            (_permissionType == READER_APPLICANT &&
                hasRole(READER_APPLICANT, _msgSender())) ||
            (hasRole(WRITER_APPLICANT, _msgSender()))
        ) {
            // Already applied, nothing to do
            return;
        }

        // Remove lower level applications if applying for write permission
        if (
            _permissionType == WRITER_APPLICANT &&
            hasRole(READER_APPLICANT, _msgSender())
        ) {
            revokeRole(READER_APPLICANT, _msgSender());
        }

        // Grant the requested applicant role
        _grantRole(_permissionType, _msgSender());
    }

    /**
     * @notice Grants permission to a university
     * @dev Only callable by the student (DEFAULT_ADMIN_ROLE)
     * @param _permissionType Permission type (READER_ROLE or WRITER_ROLE)
     * @param _university Address of university to grant permission to
     */
    function grantPermission(
        bytes32 _permissionType,
        address _university
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Check if the permission exists
        if (_permissionType != WRITER_ROLE && _permissionType != READER_ROLE) {
            revert WrongRole();
        }

        // Grant the requested permission
        grantRole(_permissionType, _university);

        // Remove lower permission if granting higher one, or vice versa
        // (a university shouldn't have both read and write permissions simultaneously)
        if (
            _permissionType == WRITER_ROLE && hasRole(READER_ROLE, _university)
        ) {
            revokeRole(READER_ROLE, _university);
        } else if (
            _permissionType == READER_ROLE && hasRole(WRITER_ROLE, _university)
        ) {
            revokeRole(WRITER_ROLE, _university);
        }

        // Remove the university from the applicants list if present
        if (hasRole(WRITER_APPLICANT, _university)) {
            revokeRole(WRITER_APPLICANT, _university);
        } else if (hasRole(READER_APPLICANT, _university)) {
            revokeRole(READER_APPLICANT, _university);
        }
    }

    /**
     * @notice Revokes all permissions from a university
     * @dev Only callable by the student (DEFAULT_ADMIN_ROLE)
     * @param _university Address of university to revoke permissions from
     */
    function revokePermission(
        address _university
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (hasRole(WRITER_ROLE, _university)) {
            revokeRole(WRITER_ROLE, _university);
        } else {
            revokeRole(READER_ROLE, _university);
        }
    }

    /**
     * @notice Lists all universities with a specific permission type
     * @dev Only callable by the student (DEFAULT_ADMIN_ROLE)
     * @param _permissionType Permission type to query (READER_ROLE or WRITER_ROLE)
     * @return Array of university addresses with specified permission
     */
    function getPermissions(
        bytes32 _permissionType
    ) external view onlyRole(DEFAULT_ADMIN_ROLE) returns (address[] memory) {
        // Check if the permission exists
        require(
            _permissionType == WRITER_ROLE ||
                _permissionType == READER_ROLE ||
                _permissionType == READER_APPLICANT ||
                _permissionType == WRITER_APPLICANT,
            WrongRole()
        );
        return getRoleMembers(_permissionType);
    }

    /**
     * @notice Verifies the caller's highest permission level for this student wallet
     * @dev Returns the highest permission role the caller has, with WRITER_ROLE taking precedence over READER_ROLE
     * @return bytes32 The highest permission role (WRITER_ROLE, READER_ROLE, or bytes32(0) if no permission)
     */
    function verifyPermission() external view returns (bytes32) {
        // Check for write permission first (highest privilege)
        if (hasRole(WRITER_ROLE, _msgSender())) {
            return WRITER_ROLE;
        }
        // Then check for read permission
        if (hasRole(READER_ROLE, _msgSender())) {
            return READER_ROLE;
        }
        // Return bytes32(0) if no permission
        return bytes32(0);
    }
}
