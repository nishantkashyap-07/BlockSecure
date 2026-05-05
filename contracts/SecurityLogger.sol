/**
 *Submitted for verification at Etherscan.io on 2025-06-06
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title SecurityLogger
 * @dev Smart contract for logging security events on the blockchain
 */
contract SecurityLogger {
    // Structure to store security event details
    struct SecurityEvent {
        string eventType;
        string details;
        string severity;
        string userId;
        uint256 timestamp;
        bool exists;
    }
    
    // Mapping from event ID to security event
    mapping(bytes32 => SecurityEvent) private securityEvents;
    
    // Array to store all event IDs
    bytes32[] private eventIds;
    
    // Event emitted when a new security event is logged
    event EventLogged(
        bytes32 indexed eventId,
        string eventType,
        string severity,
        string userId,
        uint256 timestamp
    );
    
    /**
     * @dev Logs a security event to the blockchain
     * @param eventType Type of security event (e.g., SQL_INJECTION, BRUTE_FORCE)
     * @param details Detailed description of the event
     * @param severity Severity level (HIGH, MEDIUM, LOW)
     * @param userId ID of the user who triggered the event
     * @return eventId Unique ID of the logged event
     */
    function logSecurityEvent(
        string memory eventType,
        string memory details,
        string memory severity,
        string memory userId
    ) public returns (bytes32) {
        // Generate a unique event ID using keccak256 hash
        bytes32 eventId = keccak256(
            abi.encodePacked(
                eventType,
                details,
                severity,
                userId,
                block.timestamp,
                eventIds.length
            )
        );
        
        // Store the security event
        securityEvents[eventId] = SecurityEvent({
            eventType: eventType,
            details: details,
            severity: severity,
            userId: userId,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Add event ID to the array
        eventIds.push(eventId);
        
        // Emit event
        emit EventLogged(eventId, eventType, severity, userId, block.timestamp);
        
        return eventId;
    }
    
    /**
     * @dev Retrieves a security event by its ID
     * @param eventId ID of the security event to retrieve
     * @return Event details (eventType, details, severity, userId, timestamp)
     */
    function getSecurityEvent(bytes32 eventId) public view returns (
        string memory,
        string memory,
        string memory,
        string memory,
        uint256
    ) {
        require(securityEvents[eventId].exists, "Event does not exist");
        
        SecurityEvent memory evt = securityEvents[eventId];
        
        return (
            evt.eventType,
            evt.details,
            evt.severity,
            evt.userId,
            evt.timestamp
        );
    }
    
    /**
     * @dev Gets the total number of security events logged
     * @return Total number of events
     */
    function getTotalEvents() public view returns (uint256) {
        return eventIds.length;
    }
    
    /**
     * @dev Gets an event ID by its index
     * @param index Index of the event ID in the array
     * @return Event ID at the specified index
     */
    function getEventIdByIndex(uint256 index) public view returns (bytes32) {
        require(index < eventIds.length, "Index out of bounds");
        return eventIds[index];
    }
}