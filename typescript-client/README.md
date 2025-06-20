# COTI Private Ticketing TypeScript Client

A TypeScript implementation of the COTI Private Ticketing demo, providing a client library for interacting with the PrivateTicketing smart contract using the @coti-ethers library.

## Features

- Deploy and interact with PrivateTicketing contracts
- Create encrypted events with private information
- Manage purchase permissions with encrypted access control
- Purchase tickets with encrypted price information
- Prove ticket ownership without revealing ticket details
- Transfer tickets securely between accounts
- Decrypt and view event/ticket information for authorized users

## Installation

1. Clone this repository and navigate to the typescript-client directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration:
   - Set COTI RPC URL and Chain ID
   - Add your private keys (use test accounts)
   - Optionally set a deployed contract address

## Usage

### Quick Demo

Run the full demo that replicates the Python functionality:

```bash
npm run demo
```

### Development

For development with auto-compilation:

```bash
npm run dev
```

### Using the Client Library

```typescript
import { PrivateTicketingClient } from './PrivateTicketingClient';

const client = new PrivateTicketingClient();

// Initialize with accounts
await client.initialize();

// Deploy contract (if needed)
const contractAddress = await client.deployContract();

// Connect to existing contract
await client.connectToContract(contractAddress);

// Create an encrypted event
const eventId = await client.createEvent(
  "Concert Name",
  "2024-12-25",
  "Location",
  "100", // price in COTI
  100    // total tickets
);

// Add purchase permission
await client.addPurchasePermission(eventId, buyerAddress);

// Purchase a ticket
const ticketId = await client.purchaseTicket(eventId);

// Prove ownership
const proof = await client.proveTicketOwnership(ticketId);
```

## Project Structure

- `src/PrivateTicketingClient.ts` - Main client class
- `src/demo.ts` - Demo script showing usage
- `src/types.ts` - TypeScript type definitions

## Requirements

- Node.js 18+
- Access to COTI devnet or testnet
- Test accounts with COTI tokens

## Security Notes

- Never commit private keys to version control
- Use test accounts for development
- The encryption provides privacy but should not be considered production-grade security
- Always validate contract addresses and transaction parameters

## License

MIT
