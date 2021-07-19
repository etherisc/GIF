pragma solidity 0.8.0;

// SPDX-License-Identifier: Apache-2.0

interface IQuery {
    enum OracleTypeState {
        Uninitialized,
        Proposed,
        Approved
    }
    enum OracleState {
        Proposed,
        Approved,
        Paused
    }
    enum OracleAssignmentState {
        Unassigned,
        Proposed,
        Assigned
    }

    struct OracleType {
        string inputFormat; // e.g. '(uint256 longitude,uint256 latitude)'
        string callbackFormat; // e.g. '(uint256 longitude,uint256 latitude)'
        OracleTypeState state;
        uint256 activeOracles;
    }

    struct Oracle {
        bytes32 name;
        address oracleContract;
        OracleState state;
        uint256 activeOracleTypes;
    }

    struct OracleRequest {
        bytes data;
        string callbackMethodName;
        address callbackContractAddress;
        bytes32 oracleTypeName;
        uint256 responsibleOracleId;
        uint256 createdAt;
    }

    struct OracleResponse {
        uint256 requestId;
        address responder;
        uint256 createdAt;
        bool status;
    }

    /* Logs */
    event LogOracleTypeProposed(
        bytes32 oracleTypeName,
        string inputFormat,
        string callbackFormat
    );

    event LogOracleTypeApproved(bytes32 oracleTypeName);

    event LogOracleTypeDisapproved(bytes32 oracleTypeName);

    event LogOracleProposed(uint256 oracleId, bytes32 name, address oracleContract);
    event LogOracleSetState(uint256 oracleId, OracleState state);

    event LogOracleContractUpdated(
        uint256 oracleId,
        address prevContract,
        address nextContract
    );

    event LogOracleProposedToOracleType(
        bytes32 oracleTypeName,
        uint256 oracleId
    );

    event LogOracleRevokedFromOracleType(
        bytes32 oracleTypeName,
        uint256 oracleId
    );

    event LogOracleAssignedToOracleType(
        bytes32 oracleTypeName,
        uint256 oracleId
    );

    event LogOracleRequested(uint256 requestId, uint256 responsibleOracleId);

    event LogOracleResponded(
        uint256 requestId,
        uint256 responseId,
        address responder,
        bool status
    );
}
