// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import "./Student.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * @title StudentDeployer
 * @author Diego Da Giau
 * @dev Contract responsible for deploying Student smart contract wallets using CREATE2 for deterministic address generation
 */
contract StudentDeployer {
    /**
     * @notice Deploys a new Student contract using CREATE2
     * @dev Creates a Student contract with predictable address based on salt parameter
     * @param _university Address of the university with initial WRITER_ROLE
     * @param _student Address of the student who will own the contract
     * @param _basicInfo Struct containing core biographical student's info
     * @param _entryPoint Address of the EntryPoint contract for account abstraction
     * @param _salt Unique value to ensure deterministic address generation
     * @return Address of the newly deployed Student contract
     */
    function deploy(
        address _university,
        address _student,
        Student.StudentBasicInfo calldata _basicInfo,
        address _entryPoint,
        bytes32 _salt
    ) external returns (address) {
        IEntryPoint entryPoint = IEntryPoint(_entryPoint);

        // Deploy with CREATE2 for deterministic address generation
        Student account = new Student{salt: _salt}(
            _university,
            _student,
            _basicInfo,
            entryPoint
        );

        return address(account);
    }

    /**
     * @notice Computes the address where a Student contract would be deployed
     * @dev Calculates address without deploying the contract, using CREATE2 formula
     * @param _university Address of the university with initial WRITER_ROLE
     * @param _student Address of the student who will own the contract
     * @param _basicInfo Struct containing core biographical student's info
     * @param _entryPoint Address of the EntryPoint contract for account abstraction
     * @param salt Unique value to ensure deterministic address generation
     * @return Predicted address where the contract would be deployed
     */
    function computeAddress(
        address _university,
        address _student,
        Student.StudentBasicInfo calldata _basicInfo,
        address _entryPoint,
        bytes32 salt
    ) public view returns (address) {
        // Compute the initialization code (contract bytecode + constructor args)
        bytes memory initCode = abi.encodePacked(
            type(Student).creationCode,
            abi.encode(
                _university,
                _student,
                _basicInfo,
                IEntryPoint(_entryPoint)
            )
        );

        // Compute the address using CREATE2 formula
        return
            address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                address(this),
                                salt,
                                keccak256(initCode)
                            )
                        )
                    )
                )
            );
    }
}
