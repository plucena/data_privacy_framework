# replit.md

## Overview

This is a private ticketing system built on the COTI blockchain that provides privacy-preserving event ticketing. The application combines a React frontend with an Express.js backend, utilizing COTI's privacy-focused blockchain technology to encrypt sensitive ticket and pricing information while maintaining transparency for verification.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state and React hooks for local state
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom COTI-themed color palette
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Blockchain Integration**: COTI client for private smart contract interactions
- **Development**: Hot module replacement via Vite middleware in development

### Database Schema
The application uses three main entities:
- **Users**: Authentication and user management
- **Events**: Event details with encrypted pricing and supply information
- **Tickets**: Individual ticket records with encrypted purchase prices and blockchain references

All sensitive financial data (prices, supply counts) are encrypted using COTI's privacy features before storage.

## Key Components

### Privacy Features
- **Encrypted Pricing**: Event prices are encrypted on the blockchain and in the database
- **Private Transactions**: Ticket purchases use COTI's private transaction capabilities
- **Ownership Proofs**: Zero-knowledge proofs for ticket ownership verification
- **Confidential Supply**: Total ticket supply and sales counts are kept private

### Smart Contract Integration
- **PrivateTicketingClient**: Custom client for interacting with COTI smart contracts
- **Automatic Deployment**: Contract deployment handling with fallback to existing contracts
- **Transaction Management**: Secure transaction signing and submission to COTI network

### User Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Component System**: Reusable UI components following design system principles
- **Real-time Updates**: Optimistic updates and automatic cache invalidation
- **Error Handling**: Comprehensive error states and user feedback

## Data Flow

1. **Event Creation**: Organizers create events with encrypted pricing through the frontend
2. **Blockchain Deployment**: Event details are deployed to COTI smart contracts with privacy features
3. **Database Storage**: Encrypted event data is stored locally for quick access
4. **Ticket Purchase**: Users purchase tickets through private blockchain transactions
5. **Ownership Verification**: Ticket ownership is verified using zero-knowledge proofs
6. **Transfer/Resale**: Tickets can be transferred with configurable resale markup

## External Dependencies

### Blockchain Infrastructure
- **COTI Network**: Privacy-focused blockchain for confidential transactions
- **COTI Ethers**: JavaScript library for COTI blockchain interactions
- **Smart Contracts**: Custom ticketing contracts deployed on COTI

### Development Tools
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development environment with PostgreSQL integration
- **Drizzle Kit**: Database migration and schema management

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Icon library for consistent iconography
- **Date-fns**: Date manipulation and formatting

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with HMR and PostgreSQL connection
- **Database**: Local PostgreSQL instance via Replit's database module
- **Blockchain**: COTI testnet for development and testing

### Production Build
- **Frontend**: Static build output served from Express.js
- **Backend**: Node.js server with compiled TypeScript
- **Database**: Production PostgreSQL with connection pooling
- **Blockchain**: COTI mainnet for production transactions

### Environment Configuration
- **Database URL**: Configured via DATABASE_URL environment variable
- **Private Keys**: COTI wallet private keys for smart contract interactions
- **RPC Endpoints**: Configurable COTI network endpoints

## Recent Changes

- June 20, 2025: Initial COTI blockchain integration with static wallet
- June 20, 2025: Fixed event creation date validation and price conversion to wei 
- June 20, 2025: Fixed ticket transfer validation issues
- June 20, 2025: Implemented MetaMask wallet integration with proper chain ID (7082400)
- June 20, 2025: Fixed blockchain operations for MetaMask users with frontend contract interaction

## User Preferences

Preferred communication style: Simple, everyday language.
Technical preferences: Replace static wallet connection with MetaMask integration for dynamic wallet support.