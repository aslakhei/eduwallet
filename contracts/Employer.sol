// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import {SmartAccount} from "./SmartAccount.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * @title Employer Smart Contract
 * @author Aslak Heimdal
 * @notice Manages an employer's basic information in the educational system
 * @dev Simple storage contract for employer details, similar to University contract
 */
contract Employer is SmartAccount {
    /**
     * @dev Structure containing basic employer information
     * @param companyName Full name of the company
     * @param country Country where the company is located
     * @param contactInfo Optional contact information (email, phone, etc.)
     */
    struct EmployerInfo {
        string companyName;
        string country;
        string contactInfo;
    }

    // Employer information
    EmployerInfo private employerInfo;

    /**
     * @notice Creates a new Employer contract with initial data
     * @dev Sets up the employer's basic information
     * @param _address Address of the employer owner
     * @param _companyName Full name of the company
     * @param _country Country where the company is located
     * @param _contactInfo Optional contact information
     * @param _entryPoint EntryPoint contract address used by the account abstraction layer
     */
    constructor(
        address _address,
        string memory _companyName,
        string memory _country,
        string memory _contactInfo,
        IEntryPoint _entryPoint
    ) SmartAccount(_entryPoint, _address) {
        employerInfo.companyName = _companyName;
        employerInfo.country = _country;
        employerInfo.contactInfo = _contactInfo;
    }

    /**
     * @notice Retrieves the employer's information
     * @dev Returns the complete EmployerInfo struct
     * @return EmployerInfo struct containing all employer details
     */
    function getEmployerInfo() external view returns (EmployerInfo memory) {
        return employerInfo;
    }
}

