import {
    Contract,
    ContractFactory,
    TransactionReceipt,
    TransactionResponse,
    formatEther,
    parseEther,
    parseUnits,
    JsonRpcProvider,
    EventLog
} from 'ethers';
import {
    Wallet,
    ctUint,
    ctString,
    itUint,
    itString
} from '@coti-io/coti-ethers';
import * as dotenv from 'dotenv';
import { PRIVATE_TICKETING_BYTECODE } from './contract-bytecode';

// Contract ABI (extracted from the compiled contract)
const PRIVATE_TICKETING_ABI = [
    "function createEvent(string name, uint256 eventDate, tuple(uint256 ciphertext, bytes signature) price, tuple(uint256 ciphertext, bytes signature) totalSupply, bool resaleAllowed, tuple(uint256 ciphertext, bytes signature) resaleMarkup)",
    "function purchaseTicket(uint256 eventId)",
    "function purchaseTicketSimple(uint256 eventId)", 
    "function proveOwnership(uint256 ticketId)",
    "function getMyTicketPrice(uint256 ticketId)",
    "function transferTicket(uint256 ticketId, address to)",
    "function getMyTicketIds() view returns (uint256[])",
    "function events(uint256) view returns (uint256 eventId, address organizer, string name, uint256 eventDate, uint256 encryptedPrice, uint256 encryptedTotalSupply, uint256 encryptedTicketsSold, bool resaleAllowed, uint256 encryptedResaleMarkup)",
    "function tickets(uint256) view returns (uint256 ticketId, uint256 eventId, address owner, uint256 encryptedPurchasePrice)",
    "function setPermission(tuple(address caller, string operation, bool active, uint256 timestampBefore, uint256 timestampAfter, bool falseKey, bool trueKey, uint256 uintParameter, address addressParameter, string stringParameter) inputData) returns (bool)",
    "event EventCreated(uint256 indexed eventId, address indexed organizer, string name)",
    "event TicketPurchased(uint256 indexed ticketId, uint256 indexed eventId, address indexed owner)",
    "event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to)",
    "event OwnershipProof(uint256 indexed ticketId, address indexed owner, uint256 encryptedProof)",
    "event EncryptedValueForUser(address indexed user, uint256 value)",
    "error EventNotFound()",
    "error NotOwner()",
    "error InvalidRecipient()",
    "error PermissionDenied(address user, string operation)"
];

export interface EventInfo {
    eventId: number;
    organizer: string;
    name: string;
    eventDate: Date;
    encryptedPrice: string;
    encryptedTotalSupply: string;
    encryptedTicketsSold: string;
    resaleAllowed: boolean;
    encryptedResaleMarkup: string;
}

export interface TicketInfo {
    ticketId: number;
    eventId: number;
    owner: string;
    encryptedPurchasePrice: string;
}

export interface CreateEventParams {
    name: string;
    price: number;
    totalSupply: number;
    resaleAllowed?: boolean;
    resaleMarkup?: number;
}

export class PrivateTicketingClient {
    private provider: JsonRpcProvider;
    private wallet: Wallet;
    private contract: Contract | null = null;
    private gasLimit: number = 10000000;
    private gasPriceGwei: number = 30;

    constructor(privateKey: string, rpcUrl: string = "https://testnet.coti.io/rpc") {
        this.provider = new JsonRpcProvider(rpcUrl);
        this.wallet = new Wallet(privateKey, this.provider);
    }

    /**
     * Initialize connection to COTI network and setup account
     */
    async initConnection(): Promise<void> {
        try {
            console.log("🔗 Initializing connection to COTI network...");
            
            // Ensure wallet is onboarded for encrypted operations
            await this.wallet.generateOrRecoverAes();
            
            // Get balance
            const balance = await this.provider.getBalance(this.wallet.address);
            console.log(`✅ Connected! Account: ${this.wallet.address}`);
            console.log(`💰 Balance: ${formatEther(balance)} COTI`);
            
            if (balance === 0n) {
                throw new Error("Account balance is 0. Please fund your account.");
            }
        } catch (error) {
            console.error("❌ Failed to initialize connection:", error);
            throw error;
        }
    }

    /**
     * Deploy the PrivateTicketing contract
     */
    async deployContract(): Promise<string> {
        try {
            console.log("\n🚀 Deploying PrivateTicketing contract...");
            
            const factory = new ContractFactory(PRIVATE_TICKETING_ABI, PRIVATE_TICKETING_BYTECODE, this.wallet);
            
            const deployTx = await factory.deploy({
                gasLimit: this.gasLimit,
                gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
            });

            console.log("⏳ Waiting for deployment confirmation...");
            const receipt = await deployTx.waitForDeployment();
            const contractAddress = await receipt.getAddress();
            
            this.contract = new Contract(contractAddress, PRIVATE_TICKETING_ABI, this.wallet);
            
            console.log(`✅ Contract deployed at: ${contractAddress}`);
            return contractAddress;
        } catch (error) {
            console.error("❌ Failed to deploy contract:", error);
            throw error;
        }
    }

    /**
     * Connect to an existing contract
     */
    async connectToContract(contractAddress: string): Promise<void> {
        try {
            this.contract = new Contract(contractAddress, PRIVATE_TICKETING_ABI, this.wallet);
            console.log(`✅ Connected to contract at: ${contractAddress}`);
        } catch (error) {
            console.error("❌ Failed to connect to contract:", error);
            throw error;
        }
    }

    /**
     * Create a new event with encrypted pricing
     */
    async createEvent(params: CreateEventParams): Promise<number> {
        if (!this.contract) {
            throw new Error("Contract not initialized. Call deployContract() or connectToContract() first.");
        }

        try {
            console.log(`\n🎫 Creating event: ${params.name}`);
            console.log(`💰 Price: ${params.price} (will be encrypted)`);
            console.log(`📊 Total Supply: ${params.totalSupply} (will be encrypted)`);

            // Event date (1 week from now)
            const eventDate = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

            // Get function selector for encryption
            const functionSelector = this.contract.interface.getFunction("createEvent")!.selector;

            // Encrypt the values
            const encryptedPrice = await this.wallet.encryptValue(
                BigInt(params.price), 
                await this.contract.getAddress(), 
                functionSelector
            );

            const encryptedTotalSupply = await this.wallet.encryptValue(
                BigInt(params.totalSupply), 
                await this.contract.getAddress(), 
                functionSelector
            );

            const encryptedResaleMarkup = await this.wallet.encryptValue(
                BigInt(params.resaleMarkup || 0), 
                await this.contract.getAddress(), 
                functionSelector
            );

            // Execute transaction
            const tx = await this.contract.createEvent(
                params.name,
                eventDate,
                encryptedPrice,
                encryptedTotalSupply,
                params.resaleAllowed || false,
                encryptedResaleMarkup,
                {
                    gasLimit: this.gasLimit,
                    gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
                }
            );

            console.log("⏳ Waiting for transaction confirmation...");
            const receipt = await tx.wait();

            // Get event ID from logs
            const eventCreatedFilter = this.contract.filters.EventCreated();
            const logs = await this.contract.queryFilter(eventCreatedFilter, receipt.blockNumber, receipt.blockNumber);
            
            if (logs.length === 0) {
                throw new Error("Event creation failed - no EventCreated event found");
            }

            const eventId = (logs[0] as EventLog).args![0];
            console.log(`✅ Event created with ID: ${eventId}`);

            // Set up purchase permissions
            await this.grantPurchasePermission(eventId, this.wallet.address);

            return Number(eventId);
        } catch (error) {
            console.error("❌ Failed to create event:", error);
            throw error;
        }
    }

    /**
     * Grant purchase permission to a user for an event
     */
    async grantPurchasePermission(eventId: number, userAddress: string): Promise<void> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`🔑 Granting purchase permission to ${userAddress} for event ${eventId}...`);

            const permissionData = {
                caller: userAddress,
                operation: "op_purchase_ticket",
                active: true,
                timestampBefore: 0,
                timestampAfter: 0,
                falseKey: false,
                trueKey: false,
                uintParameter: eventId,
                addressParameter: "0x0000000000000000000000000000000000000000",
                stringParameter: ""
            };

            const tx = await this.contract.setPermission(permissionData, {
                gasLimit: this.gasLimit,
                gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
            });

            await tx.wait();
            console.log(`✅ Permission granted successfully!`);
        } catch (error) {
            console.error("❌ Failed to grant permission:", error);
            throw error;
        }
    }

    /**
     * Purchase a ticket for an event
     */
    async purchaseTicket(eventId: number): Promise<number | null> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`\n🎟️ Purchasing ticket for event ${eventId}...`);

            // Try simple purchase first
            const tx = await this.contract.purchaseTicketSimple(eventId, {
                gasLimit: this.gasLimit,
                gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
            });

            console.log("⏳ Waiting for transaction confirmation...");
            const receipt = await tx.wait();

            if (receipt.status === 0) {
                console.log("❌ Transaction failed");
                return null;
            }

            // Get ticket ID from logs
            const ticketPurchasedFilter = this.contract.filters.TicketPurchased();
            const logs = await this.contract.queryFilter(ticketPurchasedFilter, receipt.blockNumber, receipt.blockNumber);
            
            if (logs.length === 0) {
                console.log("⚠️ No TicketPurchased event found in logs");
                return null;
            }

            const ticketId = (logs[0] as EventLog).args![0];
            console.log(`✅ Ticket purchased! Ticket ID: ${ticketId}`);
            return Number(ticketId);
        } catch (error) {
            console.error("❌ Failed to purchase ticket:", error);
            return null;
        }
    }

    /**
     * Prove ownership of a ticket without revealing the price
     */
    async proveOwnership(ticketId: number): Promise<bigint | null> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`\n🔐 Proving ownership of ticket ${ticketId}...`);

            const tx = await this.contract.proveOwnership(ticketId, {
                gasLimit: this.gasLimit,
                gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
            });

            const receipt = await tx.wait();

            // Get proof from logs
            const ownershipProofFilter = this.contract.filters.OwnershipProof();
            const logs = await this.contract.queryFilter(ownershipProofFilter, receipt.blockNumber, receipt.blockNumber);
            
            if (logs.length === 0) {
                console.log("⚠️ No OwnershipProof event found in logs");
                return null;
            }

            const encryptedProof = (logs[0] as EventLog).args![2];

            // Decrypt the proof (only the owner can do this)
            const decryptedProof = await this.wallet.decryptValue(encryptedProof as ctUint);

            console.log(`✅ Ownership proved! Encrypted proof: ${encryptedProof}`);
            console.log(`🔓 Decrypted proof: ${decryptedProof}`);
            return decryptedProof as bigint;
        } catch (error) {
            console.error("❌ Failed to prove ownership:", error);
            return null;
        }
    }

    /**
     * Get the encrypted price of a ticket (only owner can decrypt)
     */
    async getMyTicketPrice(ticketId: number): Promise<bigint | null> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`\n💰 Getting price for ticket ${ticketId}...`);

            const tx = await this.contract.getMyTicketPrice(ticketId, {
                gasLimit: this.gasLimit,
                gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
            });

            const receipt = await tx.wait();

            // Get encrypted value from logs
            const encryptedValueFilter = this.contract.filters.EncryptedValueForUser();
            const logs = await this.contract.queryFilter(encryptedValueFilter, receipt.blockNumber, receipt.blockNumber);
            
            if (logs.length === 0) {
                console.log("⚠️ No EncryptedValueForUser event found in logs");
                return null;
            }

            const encryptedPrice = (logs[0] as EventLog).args![1];

            // Decrypt the price (only the owner can do this)
            const decryptedPrice = await this.wallet.decryptValue(encryptedPrice as ctUint);

            console.log(`✅ Encrypted price: ${encryptedPrice}`);
            console.log(`🔓 Decrypted price: ${decryptedPrice}`);
            return decryptedPrice as bigint;
        } catch (error) {
            console.error("❌ Failed to get ticket price:", error);
            return null;
        }
    }

    /**
     * Transfer a ticket to another address
     */
    async transferTicket(ticketId: number, toAddress: string): Promise<TransactionReceipt | null> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`\n📤 Transferring ticket ${ticketId} to ${toAddress}...`);

            const tx = await this.contract.transferTicket(ticketId, toAddress, {
                gasLimit: this.gasLimit,
                gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
            });

            const receipt = await tx.wait();
            console.log(`✅ Ticket transferred successfully!`);
            return receipt;
        } catch (error) {
            console.error("❌ Failed to transfer ticket:", error);
            return null;
        }
    }

    /**
     * Get all ticket IDs owned by the current account
     */
    async getMyTickets(): Promise<number[]> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`\n📋 Getting tickets for ${this.wallet.address}...`);

            const ticketIds = await this.contract.getMyTicketIds();
            const ticketNumbers = ticketIds.map((id: bigint) => Number(id));

            console.log(`✅ Found ${ticketNumbers.length} tickets: ${ticketNumbers}`);
            return ticketNumbers;
        } catch (error) {
            console.error("❌ Failed to get tickets:", error);
            return [];
        }
    }

    /**
     * Get basic information about an event (non-encrypted fields only)
     */
    async getEventInfo(eventId: number): Promise<EventInfo | null> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`\n📅 Getting info for event ${eventId}...`);

            const eventInfo = await this.contract.events(eventId);

            const eventData: EventInfo = {
                eventId: Number(eventInfo[0]),
                organizer: eventInfo[1],
                name: eventInfo[2],
                eventDate: new Date(Number(eventInfo[3]) * 1000),
                encryptedPrice: eventInfo[4].toString(),
                encryptedTotalSupply: eventInfo[5].toString(),
                encryptedTicketsSold: eventInfo[6].toString(),
                resaleAllowed: eventInfo[7],
                encryptedResaleMarkup: eventInfo[8].toString()
            };

            console.log(`✅ Event Info:`);
            console.log(`   📛 Name: ${eventData.name}`);
            console.log(`   👤 Organizer: ${eventData.organizer}`);
            console.log(`   📅 Date: ${eventData.eventDate}`);
            console.log(`   🔒 Encrypted Price: ${eventData.encryptedPrice}`);
            console.log(`   🔒 Encrypted Supply: ${eventData.encryptedTotalSupply}`);
            console.log(`   🔒 Encrypted Sold: ${eventData.encryptedTicketsSold}`);
            console.log(`   🔄 Resale Allowed: ${eventData.resaleAllowed}`);

            return eventData;
        } catch (error) {
            console.error("❌ Failed to get event info:", error);
            return null;
        }
    }

    /**
     * Create a second account for testing transfers
     */
    async createSecondAccount(): Promise<Wallet> {
        try {
            console.log("\n👥 Creating second account for testing...");

            // Create new wallet with COTI support
            const randomWallet = Wallet.createRandom();
            const newWallet = new Wallet(randomWallet.privateKey, this.provider);

            // Fund the account
            console.log("💸 Funding second account...");
            const tx = await this.wallet.sendTransaction({
                to: newWallet.address,
                value: parseEther("0.5"),
                gasLimit: this.gasLimit,
                gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
            });

            await tx.wait();

            // Generate encryption key for the new wallet
            await newWallet.generateOrRecoverAes();

            console.log(`✅ Second account created: ${newWallet.address}`);
            return newWallet;
        } catch (error) {
            console.error("❌ Failed to create second account:", error);
            throw error;
        }
    }

    /**
     * Run the complete demo
     */
    async runDemo(): Promise<void> {
        console.log("🎭 Private Ticketing Demo Starting...");
        console.log("=" .repeat(50));

        try {
            // 1. Initialize connection
            await this.initConnection();

            // 2. Deploy contract
            const contractAddress = await this.deployContract();

            // 3. Create an event
            const eventId = await this.createEvent({
                name: "COTI Privacy Concert",
                price: 100,  // 100 tokens
                totalSupply: 1000,  // 1000 tickets
                resaleAllowed: true,
                resaleMarkup: 20  // 20% markup
            });

            // 4. Get event info
            await this.getEventInfo(eventId);

            // 5. Purchase a ticket
            const ticketId = await this.purchaseTicket(eventId);

            if (ticketId === null) {
                console.log("❌ Ticket purchase failed, aborting demo");
                return;
            }

            // 6. Check my tickets
            await this.getMyTickets();

            // 7. Prove ownership
            await this.proveOwnership(ticketId);

            // 8. Get ticket price (encrypted)
            await this.getMyTicketPrice(ticketId);

            // 9. Create second account and transfer ticket
            const aliceAccount = await this.createSecondAccount();
            await this.transferTicket(ticketId, aliceAccount.address);

            // 10. Verify transfer
            console.log("\n🔍 Verifying transfer...");
            const remainingTickets = await this.getMyTickets();
            
            if (!remainingTickets.includes(ticketId)) {
                console.log("✅ Ticket successfully transferred");
            } else {
                console.log("⚠️ Ticket transfer may have failed");
            }

            console.log("\n" + "=".repeat(50));
            console.log("🎉 Demo completed successfully!");
            console.log("📝 Summary:");
            console.log(`   - Contract deployed at: ${contractAddress}`);
            console.log(`   - Event created with ID: ${eventId}`);
            console.log(`   - Ticket purchased with ID: ${ticketId}`);
            console.log(`   - Ticket transferred to: ${aliceAccount.address}`);
            console.log("   - All operations used encrypted values for privacy!");

        } catch (error) {
            console.error(`\n❌ Demo failed: ${error}`);
            throw error;
        }
    }
}
