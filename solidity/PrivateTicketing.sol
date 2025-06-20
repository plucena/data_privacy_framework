// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@coti-io/coti-contracts/contracts/access/DataPrivacyFramework/extensions/DataPrivacyFrameworkMpc.sol";

contract PrivateTicketing is DataPrivacyFrameworkMpc {

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
    mapping(uint256 => ctUint64) public resaleListings;

    uint256 private eventCounter;
    uint256 private ticketCounter;

    event EventCreated(uint256 indexed eventId, address indexed organizer, string name);
    event TicketPurchased(uint256 indexed ticketId, uint256 indexed eventId, address indexed owner);
    event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to);
    event TicketListedForResale(uint256 indexed ticketId, ctUint64 resalePrice);
    event OwnershipProof(uint256 indexed ticketId, address indexed owner, ctUint64 encryptedProof);
    event EncryptedValueForUser(address indexed user, ctUint64 value);

    // Custom errors (more efficient than string messages)
    error NotOwner();
    error EventNotFound();
    error InvalidRecipient();
    error TicketsNotAvailable();
    error PurchaseCheckFailed();

    modifier onlyTicketOwner(uint256 ticketId) {
        if (tickets[ticketId].owner != msg.sender) revert NotOwner();
        _;
    }

    constructor() DataPrivacyFrameworkMpc(false, false) {
        setPermission(InputData(msg.sender, "op_create_event", true, 0, 0, false, false, 0, address(0), ""));
    }

    function createEvent(
        string memory name,
        uint256 eventDate,
        itUint64 calldata price,
        itUint64 calldata totalSupply,
        bool resaleAllowed,
        itUint64 calldata resaleMarkup
    ) external onlyAllowedUserOperation("op_create_event", 0, address(0), "") {
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
        
        setPermission(InputData(address(0), "op_purchase_ticket", true, 0, 0, true, false, eventId, address(0), ""));
        emit EventCreated(eventId, msg.sender, name);
    }

    function purchaseTicket(uint256 eventId)
        external
        onlyAllowedUserOperation("op_purchase_ticket", eventId, address(0), "")
    {
        Event storage _event = events[eventId];
        if (_event.eventId == 0) revert EventNotFound();

        gtUint64 gtTicketsSold = MpcCore.onBoard(_event.encryptedTicketsSold);
        gtUint64 gtTotalSupply = MpcCore.onBoard(_event.encryptedTotalSupply);
        
        // Check if tickets are available using a less problematic MPC operation
        gtBool isAvailable = MpcCore.lt(gtTicketsSold, gtTotalSupply);
        
        // Assert that tickets are available. This will revert with a specific
        // error message if the condition is false, which is better for debugging.
        MpcCore.assert(isAvailable, "TicketsNotAvailable()");

        // If the check passes, increment tickets sold
        gtUint64 gtOne = MpcCore.setPublic64(1);
        _event.encryptedTicketsSold = MpcCore.offBoard(MpcCore.add(gtTicketsSold, gtOne));

        uint256 ticketId = ++ticketCounter;
        
        tickets[ticketId] = Ticket({
            ticketId: ticketId,
            eventId: eventId,
            owner: msg.sender,
            encryptedPurchasePrice: _event.encryptedPrice
        });

        userTickets[msg.sender].push(ticketId);

        setPermission(InputData(msg.sender, "op_transfer_ticket", true, 0, 0, false, false, ticketId, address(0), ""));
        setPermission(InputData(msg.sender, "op_prove_ownership", true, 0, 0, false, false, ticketId, address(0), ""));

        emit TicketPurchased(ticketId, eventId, msg.sender);
    }
    
    function proveOwnership(uint256 ticketId)
        external
        onlyAllowedUserOperation("op_prove_ownership", ticketId, address(0), "")
        onlyTicketOwner(ticketId)
    {
        uint256 proofClear = uint256(keccak256(abi.encodePacked(block.timestamp, ticketId)));
        uint64 proofClear64 = uint64(proofClear);
        gtUint64 gtProof = MpcCore.setPublic64(proofClear64);
        ctUint64 ctProofForUser = MpcCore.offBoardToUser(gtProof, msg.sender);

        emit OwnershipProof(ticketId, msg.sender, ctProofForUser);
    }

    function transferTicket(uint256 ticketId, address to) 
        external
        onlyAllowedUserOperation("op_transfer_ticket", ticketId, address(0), "")
        onlyTicketOwner(ticketId)
    {
        if (to == address(0)) revert InvalidRecipient();

        address from = msg.sender;
        tickets[ticketId].owner = to;

        // Remove from sender's tickets
        uint256[] storage senderTickets = userTickets[from];
        for (uint i = 0; i < senderTickets.length; i++) {
            if (senderTickets[i] == ticketId) {
                senderTickets[i] = senderTickets[senderTickets.length - 1];
                senderTickets.pop();
                break;
            }
        }
        
        userTickets[to].push(ticketId);

        // Transfer permissions
        setPermission(InputData(from, "op_transfer_ticket", false, 0, 0, false, false, ticketId, address(0), ""));
        setPermission(InputData(from, "op_prove_ownership", false, 0, 0, false, false, ticketId, address(0), ""));
        setPermission(InputData(to, "op_transfer_ticket", true, 0, 0, false, false, ticketId, address(0), ""));
        setPermission(InputData(to, "op_prove_ownership", true, 0, 0, false, false, ticketId, address(0), ""));

        emit TicketTransferred(ticketId, from, to);
    }

    function getMyTicketIds() external view returns (uint256[] memory) {
        return userTickets[msg.sender];
    }
    
    function getMyTicketPrice(uint256 ticketId) external onlyTicketOwner(ticketId) {
        emit EncryptedValueForUser(msg.sender, tickets[ticketId].encryptedPurchasePrice);
    }
}