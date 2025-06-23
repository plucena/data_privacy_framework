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
            console.log(`🔓 Decrypted proof value: ${decryptedProof}`);

            return decryptedProof;
        } catch (error) {
            console.error("❌ Failed to prove ownership:", error);
            return null;
        }
    }

    /**
     * Get the purchase price of a ticket (only owner can decrypt)
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

            const encryptedValue = (logs[0] as EventLog).args![1];

            // Decrypt the value (only the owner can do this)
            const decryptedPrice = await this.wallet.decryptValue(encryptedValue as ctUint);

            console.log(`✅ Ticket price retrieved!`);
            console.log(`🔓 Purchase price: ${decryptedPrice}`);

            return decryptedPrice;
        } catch (error) {
            console.error("❌ Failed to get ticket price:", error);
            return null;
        }
    }

    /**
     * Transfer a ticket to another address
     */
    async transferTicket(ticketId: number, toAddress: string): Promise<void> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`\n🔄 Transferring ticket ${ticketId} to ${toAddress}...`);

            const tx = await this.contract.transferTicket(ticketId, toAddress, {
                gasLimit: this.gasLimit,
                gasPrice: parseUnits(this.gasPriceGwei.toString(), 'gwei')
            });

            console.log("⏳ Waiting for transaction confirmation...");
            const receipt = await tx.wait();

            console.log(`✅ Ticket transferred successfully!`);
        } catch (error) {
            console.error("❌ Failed to transfer ticket:", error);
            throw error;
        }
    }

    /**
     * Get all ticket IDs owned by the current wallet
     */
    async getMyTickets(): Promise<number[]> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            console.log(`\n🎫 Getting my tickets...`);

            const ticketIds = await this.contract.getMyTicketIds();
            const ticketIdNumbers = ticketIds.map((id: bigint) => Number(id));

            console.log(`✅ Found ${ticketIdNumbers.length} tickets: [${ticketIdNumbers.join(', ')}]`);

            return ticketIdNumbers;
        } catch (error) {
            console.error("❌ Failed to get tickets:", error);
            throw error;
        }
    }

    /**
     * Get event information
     */
    async getEventInfo(eventId: number): Promise<EventInfo | null> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            const eventData = await this.contract.events(eventId);
            
            return {
                eventId: Number(eventData[0]),
                organizer: eventData[1],
                name: eventData[2],
                eventDate: new Date(Number(eventData[3]) * 1000),
                encryptedPrice: eventData[4].toString(),
                encryptedTotalSupply: eventData[5].toString(),
                encryptedTicketsSold: eventData[6].toString(),
                resaleAllowed: eventData[7],
                encryptedResaleMarkup: eventData[8].toString()
            };
        } catch (error) {
            console.error("❌ Failed to get event info:", error);
            return null;
        }
    }

    /**
     * Get ticket information
     */
    async getTicketInfo(ticketId: number): Promise<TicketInfo | null> {
        if (!this.contract) {
            throw new Error("Contract not initialized.");
        }

        try {
            const ticketData = await this.contract.tickets(ticketId);
            
            return {
                ticketId: Number(ticketData[0]),
                eventId: Number(ticketData[1]),
                owner: ticketData[2],
                encryptedPurchasePrice: ticketData[3].toString()
            };
        } catch (error) {
            console.error("❌ Failed to get ticket info:", error);
            return null;
        }
    }

    /**
     * Run a complete demo showcasing all functionality
     */
    async runDemo(): Promise<void> {
        try {
            console.log("🎭 Starting COTI Private Ticketing Demo\n");

            // Initialize connection
            await this.initConnection();

            // Deploy or connect to contract
            let contractAddress: string;
            if (process.env.CONTRACT_ADDRESS) {
                contractAddress = process.env.CONTRACT_ADDRESS;
                await this.connectToContract(contractAddress);
            } else {
                contractAddress = await this.deployContract();
            }

            // Create an event
            const eventId = await this.createEvent({
                name: "Blockchain Summit 2024",
                price: 50,
                totalSupply: 100,
                resaleAllowed: true,
                resaleMarkup: 10
            });

            // Get event information
            const eventInfo = await this.getEventInfo(eventId);
            console.log(`\n📋 Event Info:`, eventInfo);

            // Purchase a ticket
            const ticketId = await this.purchaseTicket(eventId);
            
            if (ticketId) {
                // Prove ownership
                const proof = await this.proveOwnership(ticketId);
                
                // Get ticket price
                const price = await this.getMyTicketPrice(ticketId);
                
                // Get all my tickets
                const myTickets = await this.getMyTickets();
                
                console.log(`\n🎉 Demo completed successfully!`);
                console.log(`Contract Address: ${contractAddress}`);
                console.log(`Event ID: ${eventId}`);
                console.log(`Ticket ID: ${ticketId}`);
                console.log(`My Tickets: [${myTickets.join(', ')}]`);
            }

        } catch (error) {
            console.error("❌ Demo failed:", error);
            throw error;
        }
    }
}
