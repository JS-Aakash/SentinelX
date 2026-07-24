// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SentinelXMaintenance
 * @dev Smart Contract for recording immutable industrial machine maintenance records on Ethereum Sepolia Testnet.
 */
contract SentinelXMaintenance {
    struct MaintenanceRecord {
        string machineId;
        string workOrderId;
        string engineerId;
        uint256 timestamp;
        string ipfsCid;
        uint8 healthScoreBefore;
        uint8 healthScoreAfter;
        address verifierWallet;
        bool isVerified;
    }

    // Mapping from workOrderId to MaintenanceRecord
    mapping(string => MaintenanceRecord) public maintenanceRecords;

    // Array of all workOrderIds for iteration
    string[] public workOrderIds;

    // Mapping from machineId to array of workOrderIds
    mapping(string => string[]) public machineHistory;

    // Authorized Admin / Manager Wallet
    address public admin;

    event MaintenanceCreated(
        string indexed machineId,
        string indexed workOrderId,
        string engineerId,
        uint256 timestamp,
        string ipfsCid,
        uint8 healthScoreBefore,
        uint8 healthScoreAfter
    );

    event MaintenanceVerified(
        string indexed workOrderId,
        address indexed verifier,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "SentinelX: Only admin or authorized backend wallet can write");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Record a verified maintenance record on-chain
     */
    function createMaintenance(
        string memory _machineId,
        string memory _workOrderId,
        string memory _engineerId,
        string memory _ipfsCid,
        uint8 _healthScoreBefore,
        uint8 _healthScoreAfter
    ) public onlyAdmin {
        require(bytes(maintenanceRecords[_workOrderId].workOrderId).length == 0, "Record already exists");

        MaintenanceRecord memory record = MaintenanceRecord({
            machineId: _machineId,
            workOrderId: _workOrderId,
            engineerId: _engineerId,
            timestamp: block.timestamp,
            ipfsCid: _ipfsCid,
            healthScoreBefore: _healthScoreBefore,
            healthScoreAfter: _healthScoreAfter,
            verifierWallet: msg.sender,
            isVerified: true
        });

        maintenanceRecords[_workOrderId] = record;
        workOrderIds.push(_workOrderId);
        machineHistory[_machineId].push(_workOrderId);

        emit MaintenanceCreated(
            _machineId,
            _workOrderId,
            _engineerId,
            block.timestamp,
            _ipfsCid,
            _healthScoreBefore,
            _healthScoreAfter
        );
    }

    /**
     * @dev Verify an existing maintenance record
     */
    function verifyMaintenance(string memory _workOrderId) public onlyAdmin {
        require(bytes(maintenanceRecords[_workOrderId].workOrderId).length > 0, "Record does not exist");
        maintenanceRecords[_workOrderId].isVerified = true;
        maintenanceRecords[_workOrderId].verifierWallet = msg.sender;
        emit MaintenanceVerified(_workOrderId, msg.sender, block.timestamp);
    }

    /**
     * @dev Get a maintenance record by workOrderId
     */
    function getMaintenance(string memory _workOrderId) public view returns (MaintenanceRecord memory) {
        return maintenanceRecords[_workOrderId];
    }

    /**
     * @dev Get total recorded maintenance count
     */
    function getRecordCount() public view returns (uint256) {
        return workOrderIds.length;
    }

    /**
     * @dev Get machine maintenance history workOrderIds
     */
    function getMachineHistory(string memory _machineId) public view returns (string[] memory) {
        return machineHistory[_machineId];
    }
}
