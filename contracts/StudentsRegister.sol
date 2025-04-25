// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Student} from "./Student.sol";
import {StudentDeployer} from "./StudentDeployer.sol";
import {UniversityDeployer} from "./UniversityDeployer.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

// Custom errors for better clarity
error AlreadyExistingUniversity();
error UniversityNotPresent();
error AlreadyExistingStudent();
error StudentNotPresent();

/**
 * @title StudentsRegister
 * @author Diego Da Giau
 * @notice This contract manages student registrations and university verifications
 * @dev Implements OpenZeppelin's AccessControl for role-based permissions
 *
 * TODO: Add input validation. Add events if necessary. Change require with if statements, revert and custom errors.
 * ? Is it better to save universities wallets addresses directly in the student's wallet?
 */
contract StudentsRegister is AccessControl {
    StudentDeployer private studentDeployer;
    UniversityDeployer private universityDeployer;
    IEntryPoint private entryPoint;

    // Role definitions for access control
    bytes32 private constant UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE");
    bytes32 private constant STUDENT_ROLE = keccak256("STUDENT_ROLE");

    // State variables
    mapping(address university => address universityAccount)
        private universityAccounts;
    mapping(address student => address studentAccount) private studentAccounts;

    /**
     * @notice Initializes the StudentsRegister contract with required deployers and entry point
     * @dev Sets up contract dependencies and assigns admin role to the deployer
     * @param _studentDeployer Address of the StudentDeployer contract
     * @param _universityDeployer Address of the UniversityDeployer contract
     * @param _entryPoint Address of the EntryPoint contract for account abstraction
     */
    constructor(
        address _studentDeployer,
        address _universityDeployer,
        address _entryPoint
    ) {
        studentDeployer = StudentDeployer(_studentDeployer);
        universityDeployer = UniversityDeployer(_universityDeployer);
        entryPoint = IEntryPoint(_entryPoint);
        // Grant admin role to the contract deployer
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @notice Registers a new university in the system
     * @dev Only callable by addresses with DEFAULT_ADMIN_ROLE
     * @param _address Address of the university to register
     * @param _name University's full name
     * @param _country University's country location
     * @param _shortName University's abbreviation or short identifier
     * @custom:throws AlreadyExistingUniversity if university is already registered
     */
    function subscribe(
        address _address,
        string calldata _name,
        string calldata _country,
        string calldata _shortName
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            !hasRole(UNIVERSITY_ROLE, _address),
            AlreadyExistingUniversity()
        );

        // Deploy university account contract
        address addr = universityDeployer.createUniversity(
            _address,
            _name,
            _country,
            _shortName,
            entryPoint
        );

        // Map university address to deployed account and grant role
        universityAccounts[_address] = addr;
        _grantRole(UNIVERSITY_ROLE, addr);
    }

    /**
     * @notice Retrieves the university account address for the calling university
     * @dev Returns the deployed account contract address for the message sender
     * @return Address of the university's account contract
     * @custom:throws UniversityNotPresent if university is not registered
     */
    function getUniversityAccount() external view returns (address) {
        address account = universityAccounts[_msgSender()];
        if (account != address(0)) {
            return account;
        }
        revert UniversityNotPresent();
    }

    /**
     * @notice Registers a new student in the system
     * @dev Only callable by addresses with UNIVERSITY_ROLE
     * @param _student Address of the student to register
     * @param _basicInfo Struct containing core biographical student's info
     * @param _salt Unique bytes32 value to ensure deterministic address generation
     * @custom:throws AlreadyExistingStudent if student is already registered
     */
    function registerStudent(
        address _student,
        Student.StudentBasicInfo calldata _basicInfo,
        bytes32 _salt
    ) external onlyRole(UNIVERSITY_ROLE) {
        // Check if student is not already registered
        require(!hasRole(STUDENT_ROLE, _student), AlreadyExistingStudent());

        // Deploy student account contract with university as initial writer
        address studentAddr = studentDeployer.deploy(
            _msgSender(),
            _student,
            _basicInfo,
            address(entryPoint),
            _salt
        );

        // Store student's contract address and grant student role
        studentAccounts[_student] = studentAddr;
        _grantRole(STUDENT_ROLE, _student);
    }

    /**
     * @notice Retrieves the student account address for the calling student
     * @dev Returns the deployed account contract address for the message sender
     * @return Address of the student's account contract
     * @custom:throws StudentNotPresent if student is not registered
     */
    function getStudentAccount() external view returns (address) {
        address account = studentAccounts[_msgSender()];
        if (account != address(0)) {
            return account;
        }
        revert StudentNotPresent();
    }
}
