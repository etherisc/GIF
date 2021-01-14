pragma solidity 0.6.11;
// SPDX-License-Identifier: Apache-2.0

import "../shared/WithRegistry.sol";
import "../shared/Delegator.sol";
import "../modules/license/ILicenseController.sol";

contract ProductService is WithRegistry, Delegator {
    bytes32 public constant NAME = "ProductService";

    constructor(address _registry) public WithRegistry(_registry) {}

    fallback() external {
        (bool authorized, address policyFlow) = license().authorize(msg.sender);

        require(authorized == true, "ERROR::NOT_AUTHORIZED");
        require(policyFlow != address(0), "ERROR::POLICY_FLOW_NOT_RESOLVED");

        _delegate(policyFlow);
    }

    function register(bytes32 _name, bytes32 _policyFlow)
        external
        returns (uint256 _registrationId)
    {
        _registrationId = license().register(_name, msg.sender, _policyFlow);
    }

    function license() internal view returns (ILicenseController) {
        return ILicenseController(registry.getContract("License"));
    }
}
