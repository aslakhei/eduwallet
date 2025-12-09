// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import "./Employer.sol";

/**
 * @title Employer Deployer Smart Contract
 * @author Aslak Heimdal
 * @notice Provides functionality to deploy new Employer contracts
 * @dev Simple factory contract to create and deploy new Employer instances
 */
contract EmployerDeployer {
    /**
     * @notice Creates a new Employer contract with the provided details
     * @dev Deploys a new Employer instance and returns its address
     * @param _address Address of the employer owner
     * @param _companyName Full name of the company
     * @param _country Country where the company is located
     * @param _contactInfo Optional contact information
     * @param _entryPoint EntryPoint contract address used by the account abstraction layer
     * @return address The deployed Employer contract address
     */
    function deploy(
        address _address,
        string calldata _companyName,
        string calldata _country,
        string calldata _contactInfo,
        IEntryPoint _entryPoint
    ) external returns (address) {
        // Deploy new employer contract
        Employer newEmployer = new Employer(
            _address,
            _companyName,
            _country,
            _contactInfo,
            _entryPoint
        );
        return address(newEmployer);
    }
}

