// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import "@account-abstraction/contracts/core/BasePaymaster.sol";

/**
 * @title Simple Paymaster Contract
 * @author Diego Da Giau
 * @dev Basic paymaster implementation that sponsors gas fees for user operations
 * Inherits from BasePaymaster to handle deposit management and withdrawals
 * Code adapted from: https://github.com/eth-infinitism/account-abstraction/
 */
contract Paymaster is BasePaymaster {
    /**
     * @dev Constant representing successful validation of a user operation
     * Value of 0 indicates no time range and valid signature
     */
    uint256 constant SIG_VALIDATION_SUCCESS = 0;

    /**
     * @notice Creates a new Paymaster instance
     * @dev Initializes the BasePaymaster with the specified EntryPoint contract
     * @param _entryPoint The EntryPoint contract address for account abstraction
     */
    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    /**
     * @notice Validates a user operation before sponsoring its gas fees
     * @dev Simple implementation that accepts all operations without validation
     * @param userOp The user operation to validate
     * @param userOpHash Hash of the user operation
     * @param maxCost Maximum cost (in wei) that the paymaster is willing to pay
     * @return context Additional context data to pass to the postOp method (empty in this implementation)
     * @return validationData Packed validation data (set to SIG_VALIDATION_SUCCESS)
     */
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    )
        internal
        view
        virtual
        override
        returns (bytes memory context, uint256 validationData)
    {
        // Suppress unused variable warnings
        (userOp, userOpHash, maxCost);
        // Return empty context and success code (no time range restriction, signature valid)
        return ("", SIG_VALIDATION_SUCCESS);
    }
}
