pragma solidity 0.8.0;
// SPDX-License-Identifier: Apache-2.0

import "./LicenseStorageModel.sol";
import "../../shared/ModuleController.sol";

contract LicenseController is LicenseStorageModel, ModuleController {
    bytes32 public constant NAME = "LicenseController";

    constructor(address _registry, uint256 _productIdIncrement) WithRegistry(_registry)
    {
        // productIdIncrement should be equal to the value from the last deployed licence storage or zero
        productIdIncrement = _productIdIncrement;
    }

    /**
     * @dev Register new product
     * _addr the address of the calling contract, i.e. the product contract to register.
     */
    function register(bytes32 _name, address _addr, bytes32 _policyFlow)
        external
        returns (uint256 _id)
    {
        // todo: add restriction, allow only ProductOwners
        require(productIdByAddress[_addr] == 0, "ERROR::PRODUCT_IS_ACTIVE");

        productIdIncrement += 1;
        _id = productIdIncrement;

        // todo: check required policyFlow existence

        products[_id].name = _name;
        products[_id].addr = _addr;
        products[_id].policyFlow = _policyFlow;
        products[_id].release = getRelease();

        emit LogNewProduct(_id, _name, _addr, _policyFlow);
    }

    /*
     * @dev Approve product
     */
    function setProductApproved(uint256 _id, bool _approved) external onlyInstanceOperator {
        require(products[_id].addr != address(0), "ERROR::PRODUCT_DOES_NOT_EXIST");
        require(
            products[_id].approved != _approved,
            "ERROR::PRODUCT_WRONG_APPROVAL_STATE"
        );
        require(
            (_approved && productIdByAddress[products[_id].addr] == 0) ||
            (!_approved && productIdByAddress[products[_id].addr] != 0),
            "ERROR::PRODUCT_ADDRESS_ALREADY_APPROVED"
        );
        // todo: check if policyFlow is correct
        // todo: should we allow products with the same name?

        products[_id].approved = _approved;
        if (_approved) {
            productIdByAddress[products[_id].addr] = _id;
        } else  {
            delete productIdByAddress[products[_id].addr];
        }

        emit LogProductSetApproved(_id, products[_id].name, products[_id].addr, _approved);
    }

    function setProductPaused(uint256 _id, bool _paused) external onlyInstanceOperator {
        // todo: should be restricted to ProductOwners
        require(products[_id].addr != address(0), "ERROR::PRODUCT_DOES_NOT_EXIST");
        require(
            productIdByAddress[products[_id].addr] > 0,
            "ERROR::PRODUCT_NOT_ACTIVE"
        );

        products[_id].paused = _paused;

        emit LogProductSetPaused(_id, products[_id].name, products[_id].addr, _paused);
    }

    /**
     * @dev Check if contract is approved product
     */
    function isApprovedProduct(address _addr)
        public
        view
        returns (bool _approved)
    {
        _approved = products[productIdByAddress[_addr]].approved == true && productIdByAddress[_addr] > 0 && products[productIdByAddress[_addr]].addr == _addr;
    }

    /**
     * @dev Check if contract is paused product
     */
    function isPausedProduct(address _addr) public view returns (bool _paused) {
        _paused = products[productIdByAddress[_addr]].paused == true;
    }

    function isValidCall(address _addr) public view returns (bool _valid) {
        _valid = isApprovedProduct(_addr) && !isPausedProduct(_addr);
    }

    function authorize(address _sender)
        public
        view
        returns (bool _authorized, address _policyFlow)
    {
        _authorized = isValidCall(_sender);
        _policyFlow = getContractInRelease(
            products[productIdByAddress[_sender]].release,
            products[productIdByAddress[_sender]].policyFlow
        );
    }

    function getProductId(address _addr)
        public
        view
        returns (uint256 _productId)
    {
        require(
            productIdByAddress[_addr] > 0,
            "ERROR::PRODUCT_NOT_APPROVED_OR_DOES_NOT_EXIST"
        );

        _productId = productIdByAddress[_addr];
    }
}
