// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import {SmartAccount} from "./SmartAccount.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * @title University Smart Contract
 * @author Diego Da Giau
 * @notice Manages a university's basic information in the educational system
 * @dev Simple storage contract for university details
 *
 * TODO: Add input validation. Add events if necessary.
 * ? Is it better to save data as immutable and then return the struct when getUniversity info is called?
 */
contract University is SmartAccount {
    /**
     * @dev Structure containing basic university information
     * @param name Full name of the university
     * @param country Country where the university is located
     * @param shortName Abbreviated name or acronym of the university
     */
    struct UniversityInfo {
        string name;
        string country;
        string shortName;
    }

    // University information
    UniversityInfo private universityInfo;

    /**
     * @notice Creates a new University contract with initial data
     * @dev Sets up the university's basic information
     * @param _name Full name of the university
     * @param _country Country where the university is located
     * @param _shortName Abbreviated name or acronym of the university
     */
    constructor(
        address _address,
        string memory _name,
        string memory _country,
        string memory _shortName,
        IEntryPoint _entryPoint
    ) SmartAccount(_entryPoint, _address) {
        universityInfo.name = _name;
        universityInfo.country = _country;
        universityInfo.shortName = _shortName;
    }

    /**
     * @notice Retrieves the university's information
     * @dev Returns the complete UniversityInfo struct
     * @return UniversityInfo struct containing all university details
     */
    function getUniversityInfo() external view returns (UniversityInfo memory) {
        return universityInfo;
    }
}
