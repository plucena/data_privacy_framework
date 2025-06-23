import { PrivateTicketingClient } from './PrivateTicketingClient';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    // Get private key from environment variable
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }

    // Create client instance
    const client = new PrivateTicketingClient(privateKey, process.env.COTI_RPC_URL);

    // Run the complete demo
    await client.runDemo();
}

// Alternative: Individual function usage examples
async function individualFunctionExamples() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }

    const client = new PrivateTicketingClient(privateKey, process.env.COTI_RPC_URL);

    try {
        // Initialize connection
        await client.initConnection();

        // Deploy contract (or connect to existing one)
        const contractAddress = await client.deployContract();
        // OR connect to existing: await client.connectToContract("0x...");

        // Create an event
        const eventId = await client.createEvent({
            name: "My Concert",
            price: 50,
            totalSupply: 100,
            resaleAllowed: true,
            resaleMarkup: 10
        });

        // Get event information
        const eventInfo = await client.getEventInfo(eventId);
        console.log("Event info:", eventInfo);

        // Purchase a ticket
        const ticketId = await client.purchaseTicket(eventId);
        if (ticketId) {
            console.log("Purchased ticket:", ticketId);

            // Prove ownership
            const proof = await client.proveOwnership(ticketId);
            console.log("Ownership proof:", proof);

            // Get ticket price
            const price = await client.getMyTicketPrice(ticketId);
            console.log("Ticket price:", price);

            // Get all my tickets
            const myTickets = await client.getMyTickets();
            console.log("My tickets:", myTickets);

            // Transfer ticket to another address
            const recipient = "0x1234567890123456789012345678901234567890"; // Replace with actual address
            await client.transferTicket(ticketId, recipient);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the main demo
if (require.main === module) {
    main().catch(console.error);
}

export { main, individualFunctionExamples };
