// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import "./Student.sol";


/**
 * @title StudentDeployer
 * @author Diego Da Giau
 * @dev Contract responsible for deploying Student smart contract wallets
 */
contract StudentDeployer {
    /**
     * @notice Deploys a new Student contract
     * @dev Creates a Student instances and returns its address
     * @param _university Address of the university with initial WRITER_ROLE
     * @param _student Address of the student who will own the contract
     * @param _basicInfo Struct containing core biographical student's info
     * @param _entryPoint EntryPoint contract address used by the account abstraction layer
     * @return Address of the newly deployed Student contract
     */
    function deploy(
        address _university,
        address _student,
        Student.StudentBasicInfo calldata _basicInfo,
        IEntryPoint _entryPoint
    ) external returns (address) {
        // Deploy new student contract
        Student account = new Student(
            _university,
            _student,
            _basicInfo,
            _entryPoint
        );
        return address(account);
    }
}
