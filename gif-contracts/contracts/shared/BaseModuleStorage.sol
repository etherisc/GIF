pragma solidity 0.6.11;

import "./Delegator.sol";

contract BaseModuleStorage is Delegator {
    address public controller;

    /* solhint-disable payable-fallback */
    function() external {
        _delegate(controller);
    }
    /* solhint-enable payable-fallback */

    function _assignController(address _controller) internal {
        controller = _controller;
    }
}
