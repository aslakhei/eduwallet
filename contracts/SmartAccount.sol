// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/core/Helpers.sol";
import "hardhat/console.sol";

error UnauthorizedCall();
error ViewCallFailed();

contract SmartAccount is BaseAccount {
    address private immutable owner;
    IEntryPoint private immutable _entryPoint;

    constructor(IEntryPoint anEntryPoint, address _owner) {
        _entryPoint = anEntryPoint;
        owner = _owner;
    }

    /**
     * @inheritdoc BaseAccount
     */
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    function _validateSignature(
        PackedUserOperation calldata _userOp,
        bytes32 _userOpHash
    ) internal virtual override returns (uint256 validationData) {
        if (owner != ECDSA.recover(_userOpHash, _userOp.signature))
            return SIG_VALIDATION_FAILED;
        return SIG_VALIDATION_SUCCESS;
    }

    function _requireForExecute() internal view virtual override {
        if (msg.sender != address(_entryPoint) && msg.sender != owner) {
            revert UnauthorizedCall();
        }
    }

    function executeViewCall(
        address _targetContract,
        bytes calldata _calldata
    ) external view returns (bytes memory) {
        if (msg.sender != owner) {
            revert UnauthorizedCall();
        }

        // Static call ensures we only execute view functions
        (bool success, bytes memory returnData) = _targetContract.staticcall(
            _calldata
        );
        if (!success) {
            revert ViewCallFailed();
        }

        return returnData;
    }

    fallback() external payable {}

    receive() external payable {}
}
