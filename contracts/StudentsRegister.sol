// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Student} from "./Student.sol";
import {StudentDeployer} from "./StudentDeployer.sol";
import {UniversityDeployer} from "./UniversityDeployer.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

// Custom errors for better clarity
error AlreadyExistingUniversity();
error UniversityNotPresent();
error AlreadyExistingStudent();
error StudentNotPresent();
error RestrictedFunction();

/**
 * @title StudentsRegister
 * @author Diego Da Giau
 * @notice This contract manages student registrations and university verifications
 * @dev Implements OpenZeppelin's AccessControl for role-based permissions
 */
contract StudentsRegister is Ownable {
    StudentDeployer private immutable studentDeployer;
    UniversityDeployer private immutable universityDeployer;
    IEntryPoint private immutable entryPoint;

    // State variables
    mapping(address university => address universityAccount)
        private universityAccounts;
    mapping(address student => address studentAccount) private studentAccounts;

    /**
     * @notice Initializes the StudentsRegister contract with required deployers and entry point
     * @param _studentDeployer Address of the StudentDeployer contract
     * @param _universityDeployer Address of the UniversityDeployer contract
     * @param _entryPoint Address of the EntryPoint contract for account abstraction
     */
    constructor(
        address _studentDeployer,
        address _universityDeployer,
        address _entryPoint
    ) Ownable(_msgSender()) {
        studentDeployer = StudentDeployer(_studentDeployer);
        universityDeployer = UniversityDeployer(_universityDeployer);
        entryPoint = IEntryPoint(_entryPoint);
    }

    /**
     * @notice Registers a new university in the system
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
    ) external onlyOwner {
        // Check if university is not already registered
        if (universityAccounts[_address] != address(0)) {
            revert AlreadyExistingUniversity();
        }

        // Deploy university account contract
        address addr = universityDeployer.deploy(
            _address,
            _name,
            _country,
            _shortName,
            entryPoint
        );

        // Map university address to deployed account
        universityAccounts[_address] = addr;
    }

    /**
     * @notice Retrieves the university account address for the calling university
     * @return The address of the university's account contract
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
     * @param _student Address of the student to register
     * @param _basicInfo Struct containing core biographical student information
     * @custom:throws AlreadyExistingStudent if student is already registered
     */
    function registerStudent(
        address _student,
        Student.StudentBasicInfo calldata _basicInfo
    ) external {
        // Check if the caller is a verified university
        if (universityAccounts[_msgSender()] == address(0)) {
            revert RestrictedFunction();
        }
        // Check if student is not already registered
        if (studentAccounts[_student] != address(0)) {
            revert AlreadyExistingStudent();
        }

        // Deploy student account contract with university as initial writer
        address studentAddr = studentDeployer.deploy(
            _msgSender(),
            _student,
            _basicInfo,
            entryPoint
        );

        // Store student's contract address
        studentAccounts[_student] = studentAddr;
    }

    /**
     * @notice Retrieves the student account address for the calling student
     * @return The address of the student's account contract
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
