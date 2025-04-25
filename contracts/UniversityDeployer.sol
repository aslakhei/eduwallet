// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import "./University.sol";


/**
 * @title University Deployer Smart Contract
 * @author Diego Da Giau
 * @notice Provides functionality to deploy new University contracts
 * @dev Simple factory contract to create and deploy new University instances
 */
contract UniversityDeployer {
    /**
     * @notice Creates a new University contract with the provided details
     * @dev Deploys a new University instance and returns its address
     * @param _address Address of the university owner
     * @param _name Full name of the university
     * @param _country Country where the university is located
     * @param _shortName Abbreviated name or acronym of the university
     * @param _entryPoint EntryPoint contract address used by the account abstraction layer
     * @return address The deployed University contract address
     */
    function createUniversity(
        address _address,
        string calldata _name,
        string calldata _country,
        string calldata _shortName,
        IEntryPoint _entryPoint
    ) external returns (address) {
        // Deploy new university contract
        University newUniversity = new University(
            _address,
            _name,
            _country,
            _shortName,
            _entryPoint
        );
        return address(newUniversity);
    }
}
