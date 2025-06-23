export const contractABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "eventId", "type": "uint256"}
    ],
    "name": "purchaseTicket",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "ticketId", "type": "uint256"},
      {"internalType": "address", "name": "to", "type": "address"}
    ],
    "name": "transferTicket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "ticketId", "type": "uint256"}
    ],
    "name": "proveOwnership",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "eventId", "type": "uint256"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "grantPurchasePermission",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "eventId", "type": "uint256"}
    ],
    "name": "getEventInfo",
    "outputs": [
      {"internalType": "address", "name": "organizer", "type": "address"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "eventDate", "type": "uint256"},
      {"internalType": "uint256", "name": "encryptedPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "encryptedTotalSupply", "type": "uint256"},
      {"internalType": "uint256", "name": "encryptedTicketsSold", "type": "uint256"},
      {"internalType": "bool", "name": "resaleAllowed", "type": "bool"},
      {"internalType": "uint256", "name": "encryptedResaleMarkup", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "ticketId", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"}
    ],
    "name": "TicketPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "organizer", "type": "address"}
    ],
    "name": "EventCreated",
    "type": "event"
  }
];