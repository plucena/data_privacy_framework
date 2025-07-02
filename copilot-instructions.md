# GitHub Copilot Instructions for COTI Data Privacy Framework

## Project Overview

This project is a **COTI Data Privacy Framework Demo** that showcases privacy-preserving blockchain applications using Multi-Party Computation (MPC) and garbled circuits. The framework enables building applications (like ticketing systems) where sensitive data remains encrypted end-to-end while still allowing computations and verifications.

### Main Technologies:
- **Blockchain**: COTI Network (Layer 2 privacy-focused blockchain)
- **Smart Contracts**: Solidity ^0.8.19 with MPC extensions
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js with Express, TypeScript
- **Client Libraries**: 
  - `@coti-io/coti-ethers` (privacy-enhanced ethers.js)
  - `@coti-io/coti-sdk-typescript` (cryptographic utilities)
- **Build Tools**: Hardhat, Vite, TypeScript compiler
- **Databases**: Drizzle ORM, Neon PostgreSQL

### Key Privacy Features:
- End-to-end encryption of sensitive data
- On-chain computations without revealing inputs
- Selective disclosure and access control
- Verifiable computations with encrypted results

## Code Style & Conventions

### TypeScript/JavaScript
- **Variables**: Use `camelCase` for variables and functions
- **Constants**: Use `UPPER_SNAKE_CASE` for constants
- **Interfaces/Types**: Use `PascalCase` with descriptive names
- **Private properties**: Prefix with underscore `_privateField`
- **Async functions**: Always use `async/await` pattern, avoid `.then()` chains

### Solidity
- **Contracts**: Use `PascalCase` (e.g., `DataPrivacyFramework`, `PrivateTicketing`)
- **Functions**: Use `camelCase` (e.g., `createEvent`, `purchaseTicket`)
- **Variables**: Use `camelCase` for state variables, `_camelCase` for parameters
- **Constants**: Use `UPPER_SNAKE_CASE` (e.g., `ADDRESS_ALL`, `STRING_ALL`)
- **Modifiers**: Use descriptive names (e.g., `onlyAllowedUserOperation`)

### COTI-Specific Patterns
- **Encrypted types**: Use COTI MPC types (`ctUint64`, `gtUint64`, `itUint64`)
  - `ct` = ciphertext (user-encrypted)
  - `gt` = garbled text (computation-ready)
  - `it` = input text (for contract calls)
- **Function selectors**: Always include function selector when encrypting values
- **Privacy modifiers**: Use `onlyAllowedUserOperation` for access control

### Import Organization
```typescript
// 1. External libraries
import { ethers, Contract } from 'ethers';
import { Wallet, ctUint, itUint } from '@coti-io/coti-ethers';

// 2. Internal modules
import { PrivateTicketingClient } from './PrivateTicketingClient';

// 3. Types and interfaces
import type { CreateEventParams } from './types';

// 4. Constants and configs
import { CONTRACT_ABI, NETWORK_CONFIG } from './constants';
```

## Common Tasks & Workflows

### 1. Smart Contract Development
```solidity
// Always extend DataPrivacyFramework for privacy features
contract YourContract is DataPrivacyFramework {
    constructor() DataPrivacyFramework(false, false) {
        // Set up admin permissions
        setPermission(InputData(msg.sender, "admin", true, 0, 0, false, false, 0, address(0), ""));
    }
    
    // Use MPC types for sensitive data
    function storePrivateData(itUint64 calldata encryptedValue) 
        external 
        onlyAllowedUserOperation("operation_name", 0, address(0), "")
    {
        gtUint64 gtValue = MpcCore.validateCiphertext(encryptedValue);
        privateData[msg.sender] = MpcCore.offBoard(gtValue);
    }
}
```

### 2. Client-Side Encryption
```typescript
// Initialize wallet with encryption capabilities
const wallet = new Wallet(privateKey, provider);
await wallet.generateOrRecoverAes();

// Encrypt values for contract calls
const functionSelector = contract.interface.getFunction("functionName")!.selector;
const encryptedValue = await wallet.encryptValue(
    BigInt(plainValue),
    contractAddress,
    functionSelector
);

// Call contract with encrypted data
await contract.functionName(encryptedValue);
```

### 3. Error Handling Pattern
```typescript
try {
    console.log("🔗 Performing operation...");
    const result = await someOperation();
    console.log("✅ Operation successful:", result);
    return result;
} catch (error) {
    console.error("❌ Operation failed:", error);
    throw new Error(`Operation failed: ${error.message}`);
}
```

### 4. Environment Configuration
```typescript
// Always check for required environment variables
const requiredEnvVars = ['COTI_RPC_URL', 'PRIVATE_KEY', 'ACCOUNT_ENCRYPTION_KEY'];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
});
```

## Best Practices for Copilot

### 1. Providing Clear Context
When working with COTI privacy features, always specify:
- The privacy level required (encrypted/clear)
- Whether data should be user-encrypted or network-encrypted
- The intended audience for decryption

### 2. Function Documentation
```typescript
/**
 * Creates a new encrypted event with private pricing information
 * @param params Event creation parameters
 * @param params.name Event name (public)
 * @param params.price Ticket price (will be encrypted)
 * @param params.totalSupply Total tickets available (will be encrypted)
 * @returns Event ID for the created event
 */
async createEvent(params: CreateEventParams): Promise<number>
```

### 3. Type Safety
- Always use TypeScript interfaces for function parameters
- Define union types for different encryption states
- Use generic types for flexible encryption handling

### 4. Testing Patterns
```typescript
// Test with multiple accounts to verify privacy
const [deployer, user1, user2] = await ethers.getSigners();

// Verify encryption by checking different users can't decrypt each other's data
const user1Data = await contract.connect(user1).getEncryptedData();
const decryptionAttempt = await user2.wallet.decryptValue(user1Data);
expect(decryptionAttempt).to.not.equal(originalValue);
```

## Areas to Be Cautious

### 1. Encryption Key Management
- **Never hardcode private keys or encryption keys in source code**
- Always use environment variables for sensitive data
- Validate that accounts are properly onboarded before encryption operations
- Be careful with key recovery - lost encryption keys mean lost data access

### 2. Gas Estimation
- MPC operations consume significantly more gas than regular operations
- Always test gas limits thoroughly in development
- Consider gas price fluctuations for mainnet deployments
- Some operations may require `allowUnlimitedContractSize: true`

### 3. Privacy Leakage
- **Avoid storing sensitive data in events or logs in clear text**
- Be careful with function parameters that might reveal information
- Don't use encrypted values in `require` statements that might leak information
- Validate that view functions properly encrypt return values

### 4. Network-Specific Behavior
- Encryption behavior differs between testnet and mainnet
- Some features may not be available on all networks
- Always verify contract addresses and network configurations
- Test with actual network conditions, not just local hardhat

### 5. Debugging Encrypted Data
- Encrypted values appear as large integers - this is expected
- Use proper decryption methods to verify data integrity
- Event logs may contain encrypted data that needs special handling
- Console logging encrypted values won't show meaningful data

## Contributing Guidelines (Copilot-specific)

### 1. Code Review Process
- **Always test encryption/decryption flows** before submitting
- Verify that privacy guarantees are maintained
- Check that gas estimations are reasonable
- Ensure proper error handling for encryption failures

### 2. Documentation Requirements
- Document the privacy level of each function parameter
- Explain encryption key requirements for functions
- Include examples of proper error handling
- Specify network compatibility for new features

### 3. Security Considerations
- **Never commit `.env` files or private keys**
- Use test accounts for all development work
- Validate all user inputs before encryption
- Ensure proper access control with `onlyAllowedUserOperation`

### 4. Performance Guidelines
- Batch operations when possible to reduce gas costs
- Cache encryption keys where appropriate
- Use view functions for data that doesn't need real-time updates
- Consider off-chain encryption for non-critical operations

### 5. Integration Testing
- Test with real COTI testnet conditions
- Verify cross-account privacy guarantees
- Test with different wallet states (onboarded/not onboarded)
- Validate contract interactions with multiple simultaneous users

### 6. Copilot Suggestions Review
When accepting Copilot suggestions:
- **Verify that privacy patterns are correctly implemented**
- Check that proper COTI types are used (`ctUint64`, `gtUint64`, `itUint64`)
- Ensure function selectors are included in encryption calls
- Validate that access control modifiers are properly applied
- Test that error handling covers encryption-specific failures

### 7. Common Pitfalls to Avoid
- Don't mix encrypted and unencrypted operations without explicit conversion
- Avoid using standard ethers.js patterns for encrypted operations
- Don't assume that encrypted values can be compared directly
- Never bypass the onboarding process for encryption operations
