// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/core/Helpers.sol";

// Custom errors for better clarity
error UnauthorizedCall();
/// @param errorData Data returned by the failed call, containing error details
error ViewCallFailed(bytes errorData);

/**
 * @title Smart Account Contract
 * @author Diego Da Giau
 * @notice ERC-4337 compatible smart contract wallet enabling gas-less transactions
 * @dev Implements BaseAccount for ERC-4337 support with signature-based authorization
 * Code adapted from: https://github.com/eth-infinitism/account-abstraction/
 */
abstract contract SmartAccount is BaseAccount {
    // The EOA owner address that controls this smart account
    address private immutable owner;

    // The EntryPoint contract that processes user operations
    IEntryPoint private immutable _entryPoint;

    /**
     * @notice Creates a new smart account with specified owner and EntryPoint
     * @dev Sets the immutable owner and EntryPoint contract references
     * @param anEntryPoint Address of the EntryPoint contract for ERC-4337 support
     * @param _owner Address that will own and control this smart account
     */
    constructor(IEntryPoint anEntryPoint, address _owner) {
        _entryPoint = anEntryPoint;
        owner = _owner;
    }

    /**
     * @notice Returns the EntryPoint contract for this account
     * @dev Required override from BaseAccount
     * @return IEntryPoint interface of the EntryPoint contract
     */
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @notice Validates the signature on a user operation
     * @dev Verifies that the operation was signed by the account owner
     * @param _userOp The user operation containing the signature to validate
     * @param _userOpHash The hash of the user operation that was signed
     * @return validationData 0 if signature is valid, 1 if invalid
     */
    function _validateSignature(
        PackedUserOperation calldata _userOp,
        bytes32 _userOpHash
    ) internal virtual override returns (uint256 validationData) {
        // Verify the signature matches the owner's address
        if (owner != ECDSA.recover(_userOpHash, _userOp.signature))
            return SIG_VALIDATION_FAILED;
        return SIG_VALIDATION_SUCCESS;
    }

    /**
     * @notice Ensures only authorized callers can execute transactions
     * @dev Reverts if caller is not EntryPoint or owner
     */
    function _requireForExecute() internal view virtual override {
        if (msg.sender != address(_entryPoint) && msg.sender != owner) {
            revert UnauthorizedCall();
        }
    }

    /**
     * @notice Performs a view call to another contract
     * @dev Only the owner can execute view calls; uses staticcall to ensure no state changes
     * @param _targetContract Address of the contract to call
     * @param _calldata The encoded function data to send to the target contract
     * @return bytes The data returned from the view call
     */
    function executeViewCall(
        address _targetContract,
        bytes calldata _calldata
    ) external view returns (bytes memory) {
        // Only owner can execute view calls
        if (msg.sender != owner) {
            revert UnauthorizedCall();
        }

        // Static call ensures we only execute view functions
        (bool success, bytes memory returnData) = _targetContract.staticcall(
            _calldata
        );
        if (!success) {
            revert ViewCallFailed(returnData);
        }

        return returnData;
    }

    /**
     * @notice Fallback function to receive Ether or calls
     * @dev Allows the smart account to receive Ether transfers or contract calls
     */
    fallback() external payable {}

    /**
     * @notice Function to receive plain Ether transfers
     * @dev Allows the smart account to receive Ether
     */
    receive() external payable {}
}
