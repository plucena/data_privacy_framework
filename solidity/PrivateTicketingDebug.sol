// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@coti-io/coti-contracts/contracts/access/DataPrivacyFramework/extensions/DataPrivacyFrameworkMpc.sol";

contract PrivateTicketingDebug is DataPrivacyFrameworkMpc {

    struct Event {
        uint256 eventId;
        address organizer;
        string name;
        uint256 eventDate;
        ctUint64 encryptedPrice;
        ctUint64 encryptedTotalSupply;
        ctUint64 encryptedTicketsSold;
        bool resaleAllowed;
        ctUint64 encryptedResaleMarkup;
    }

    struct Ticket {
        uint256 ticketId;
        uint256 eventId;
        address owner;
        ctUint64 encryptedPurchasePrice;
    }
    
    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256[]) private userTickets;

    uint256 private eventCounter;
    uint256 private ticketCounter;

    // Debug events to track execution flow
    event DebugLog(string message, address user, uint256 value);
    event PermissionCheck(address user, string operation, uint256 eventId, bool hasPermission);
    event EventCreated(uint256 indexed eventId, address indexed organizer, string name);
    event TicketPurchased(uint256 indexed ticketId, uint256 indexed eventId, address indexed owner);
    event OwnershipProof(uint256 indexed ticketId, address indexed owner, ctUint64 encryptedProof);
    event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to);
    event EncryptedValueForUser(address indexed user, ctUint64 value);

    // Custom errors (more efficient than string messages)
    error NotOwner();
    error EventNotFound();
    error InvalidRecipient();
    error TicketsNotAvailable();
    error PurchaseCheckFailed();
    error PermissionDenied(address user, string operation);

    modifier onlyTicketOwner(uint256 ticketId) {
        if (tickets[ticketId].owner != msg.sender) revert NotOwner();
        _;
    }

    constructor() DataPrivacyFrameworkMpc(false, false) {
        emit DebugLog("Constructor called", msg.sender, 0);
        setPermission(InputData(msg.sender, "op_create_event", true, 0, 0, false, false, 0, address(0), ""));
        emit DebugLog("Create event permission set for deployer", msg.sender, 0);
    }

    function createEvent(
        string memory name,
        uint256 eventDate,
        itUint64 calldata price,
        itUint64 calldata totalSupply,
        bool resaleAllowed,
        itUint64 calldata resaleMarkup
    ) external onlyAllowedUserOperation("op_create_event", 0, address(0), "") {
        emit DebugLog("createEvent called", msg.sender, 0);
        
        uint256 eventId = ++eventCounter;
        
        events[eventId] = Event({
            eventId: eventId,
            organizer: msg.sender,
            name: name,
            eventDate: eventDate,
            encryptedPrice: MpcCore.offBoard(MpcCore.validateCiphertext(price)),
            encryptedTotalSupply: MpcCore.offBoard(MpcCore.validateCiphertext(totalSupply)),
            encryptedTicketsSold: MpcCore.offBoard(MpcCore.setPublic64(0)),
            resaleAllowed: resaleAllowed,
            encryptedResaleMarkup: MpcCore.offBoard(MpcCore.validateCiphertext(resaleMarkup))
        });
        
        emit DebugLog("Event struct created", msg.sender, eventId);
        
        // Set permission for anyone to purchase tickets for this event
        setPermission(InputData(address(0), "op_purchase_ticket", true, 0, 0, true, false, eventId, address(0), ""));
        emit DebugLog("Purchase permission set for all users", address(0), eventId);
        
        emit EventCreated(eventId, msg.sender, name);
        emit DebugLog("Event creation completed", msg.sender, eventId);
    }

    // Debug function to check if a user has permission
    function checkPurchasePermission(address user, uint256 eventId) external view returns (bool) {
        // This function will help us debug permission issues
        // Note: This is a simplified check - the actual permission system is more complex
        return true; // Placeholder - actual implementation would check the permission system
    }

    // Debug function that doesn't require permissions
    function debugPurchaseTicketNoPermission(uint256 eventId) external {
        emit DebugLog("debugPurchaseTicketNoPermission called", msg.sender, eventId);
        
        Event storage _event = events[eventId];
        if (_event.eventId == 0) {
            emit DebugLog("Event not found", msg.sender, eventId);
            revert EventNotFound();
        }

        emit DebugLog("Event found, proceeding with MPC operations", msg.sender, eventId);

        // Test MPC operations step by step
        gtUint64 gtTicketsSold = MpcCore.onBoard(_event.encryptedTicketsSold);
        emit DebugLog("Successfully loaded tickets sold", msg.sender, 1);
        
        gtUint64 gtTotalSupply = MpcCore.onBoard(_event.encryptedTotalSupply);
        emit DebugLog("Successfully loaded total supply", msg.sender, 2);
        
        gtBool isAvailable = MpcCore.lt(gtTicketsSold, gtTotalSupply);
        emit DebugLog("Successfully performed comparison", msg.sender, 3);
        
        // Use the division trick instead of assert
        gtUint64 gtOne = MpcCore.setPublic64(1);
        gtUint64 gtZero = MpcCore.setPublic64(0);
        gtUint64 isAvailableAsUint = MpcCore.mux(isAvailable, gtOne, gtZero);
        
        // This will revert if isAvailableAsUint is 0 (no tickets available)
        MpcCore.div(gtOne, isAvailableAsUint);
        emit DebugLog("MPC availability check passed", msg.sender, 4);
        
        // If we get here, the MPC operations work
        emit DebugLog("All MPC operations successful", msg.sender, 5);
    }

    function purchaseTicket(uint256 eventId) external {
        emit DebugLog("purchaseTicket called - starting permission check", msg.sender, eventId);
        
        // First, let's see if we can access the event
        Event storage _event = events[eventId];
        if (_event.eventId == 0) {
            emit DebugLog("Event not found", msg.sender, eventId);
            revert EventNotFound();
        }
        
        emit DebugLog("Event found, now checking permissions", msg.sender, eventId);
        
        // Try to call the simple version which has the permission check
        this.purchaseTicketSimple(eventId);
        
        emit DebugLog("Purchase completed successfully", msg.sender, eventId);
    }

    // Alternative purchase function that bypasses some checks for testing
    function purchaseTicketSimple(uint256 eventId) 
        external 
        onlyAllowedUserOperation("op_purchase_ticket", eventId, address(0), "")
    {
        emit DebugLog("purchaseTicketSimple called with permission", msg.sender, eventId);
        
        Event storage _event = events[eventId];
        if (_event.eventId == 0) {
            emit DebugLog("Event not found in simple purchase", msg.sender, eventId);
            revert EventNotFound();
        }

        emit DebugLog("Event found, creating ticket without MPC checks", msg.sender, eventId);
        
        // Skip MPC operations for now, just create the ticket
        uint256 ticketId = ++ticketCounter;
        
        tickets[ticketId] = Ticket({
            ticketId: ticketId,
            eventId: eventId,
            owner: msg.sender,
            encryptedPurchasePrice: _event.encryptedPrice
        });

        userTickets[msg.sender].push(ticketId);
        emit DebugLog("Ticket created successfully", msg.sender, ticketId);
        
        emit TicketPurchased(ticketId, eventId, msg.sender);
    }

    function getMyTicketIds() external view returns (uint256[] memory) {
        return userTickets[msg.sender];
    }

    function proveOwnership(uint256 ticketId) external {
        emit DebugLog("proveOwnership called", msg.sender, ticketId);
        
        require(tickets[ticketId].owner == msg.sender, "Not owner");
        emit DebugLog("Ownership verified", msg.sender, ticketId);
        
        uint256 proofClear = uint256(keccak256(abi.encodePacked(block.timestamp, ticketId)));
        uint64 proofClear64 = uint64(proofClear);
        gtUint64 gtProof = MpcCore.setPublic64(proofClear64);
        ctUint64 ctProofForUser = MpcCore.offBoardToUser(gtProof, msg.sender);

        emit OwnershipProof(ticketId, msg.sender, ctProofForUser);
        emit DebugLog("Ownership proof generated", msg.sender, ticketId);
    }

    function getMyTicketPrice(uint256 ticketId) external {
        emit DebugLog("getMyTicketPrice called", msg.sender, ticketId);
        
        require(tickets[ticketId].owner == msg.sender, "Not owner");
        emit DebugLog("Ownership verified for price retrieval", msg.sender, ticketId);
        
        emit EncryptedValueForUser(msg.sender, tickets[ticketId].encryptedPurchasePrice);
        emit DebugLog("Ticket price emitted", msg.sender, ticketId);
    }

    function transferTicket(uint256 ticketId, address to) external {
        emit DebugLog("transferTicket called", msg.sender, ticketId);
        
        require(tickets[ticketId].owner == msg.sender, "Not owner");
        require(to != address(0), "Invalid address");
        
        emit DebugLog("Transfer validation passed", msg.sender, ticketId);
        
        address from = msg.sender;
        tickets[ticketId].owner = to;
        
        uint256[] storage ft = userTickets[from];
        for (uint256 i = 0; i < ft.length; i++) {
            if (ft[i] == ticketId) {
                ft[i] = ft[ft.length - 1];
                ft.pop();
                break;
            }
        }
        
        userTickets[to].push(ticketId);
        emit TicketTransferred(ticketId, from, to);
        emit DebugLog("Ticket transferred successfully", msg.sender, ticketId);
    }
}
