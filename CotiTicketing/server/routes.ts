import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEventSchema, insertTicketSchema } from "@shared/schema";
import { getCotiClient, initializeCotiClient } from "./services/coti-client";
import { z } from "zod";

const createEventRequestSchema = insertEventSchema.extend({
  price: z.number().positive(),
  totalSupply: z.number().int().positive(),
  resaleMarkup: z.number().optional(),
});

const purchaseTicketSchema = z.object({
  eventId: z.number().int().positive(),
  walletAddress: z.string(),
});

const transferTicketSchema = z.object({
  toAddress: z.string(),
});

const recordPurchaseSchema = z.object({
  eventId: z.number().int().positive(),
  walletAddress: z.string(),
  blockchainTicketId: z.number().int().positive(),
  transactionHash: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize COTI client on startup
  try {
    await initializeCotiClient();
    console.log("COTI client initialized successfully");
  } catch (error) {
    console.error("Failed to initialize COTI client:", error);
  }

  // Get all events
  app.get("/api/events", async (req, res) => {
    try {
      // First get events from local storage
      let events = await storage.getAllEvents();
      
      // If no events in storage, try to sync from blockchain
      if (events.length === 0) {
        try {
          const client = getCotiClient();
          
          // Check if we have any events on the blockchain
          // Since we don't have a direct "getAllEvents" method, we'll try to get event info for IDs 0-10
          const blockchainEvents = [];
          for (let i = 0; i < 10; i++) {
            try {
              const eventInfo = await client.getEventInfo(i);
              if (eventInfo) {
                // Convert blockchain event to our format
                const dbEvent = {
                  name: eventInfo.name,
                  description: `Blockchain event #${eventInfo.eventId}`,
                  category: "Technology", // Default category for blockchain events
                  location: "COTI Network",
                  eventDate: eventInfo.eventDate,
                  organizerAddress: eventInfo.organizer,
                  contractAddress: process.env.CONTRACT_ADDRESS || null,
                  blockchainEventId: eventInfo.eventId,
                  encryptedPrice: eventInfo.encryptedPrice,
                  encryptedTotalSupply: eventInfo.encryptedTotalSupply,
                  encryptedTicketsSold: eventInfo.encryptedTicketsSold,
                  resaleAllowed: eventInfo.resaleAllowed,
                  encryptedResaleMarkup: eventInfo.encryptedResaleMarkup,
                };
                
                // Store in local database
                const storedEvent = await storage.createEvent(dbEvent);
                blockchainEvents.push(storedEvent);
              }
            } catch (err) {
              // Event doesn't exist or error fetching, continue to next
              continue;
            }
          }
          
          events = blockchainEvents;
        } catch (clientError) {
          console.error("Error fetching from blockchain:", clientError);
          // Return empty array if blockchain fetch fails
        }
      }
      
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get single event
  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Create new event
  app.post("/api/events", async (req, res) => {
    try {
      const data = createEventRequestSchema.parse(req.body);
      const client = getCotiClient();

      // Create event on blockchain (convert price to wei)
      const priceInWei = Math.floor(data.price * 1e18);
      const resaleMarkupInWei = data.resaleMarkup ? Math.floor(data.resaleMarkup * 1e18) : 0;
      
      const blockchainEventId = await client.createEvent({
        name: data.name,
        price: priceInWei,
        totalSupply: data.totalSupply,
        resaleAllowed: Boolean(data.resaleAllowed),
        resaleMarkup: resaleMarkupInWei,
      });

      // Store event in database
      const event = await storage.createEvent({
        name: data.name,
        description: data.description,
        category: data.category,
        location: data.location,
        eventDate: data.eventDate,
        organizerAddress: data.organizerAddress,
        blockchainEventId,
        resaleAllowed: data.resaleAllowed,
        contractAddress: data.contractAddress,
        encryptedPrice: data.encryptedPrice,
        encryptedTotalSupply: data.encryptedTotalSupply,
        encryptedTicketsSold: data.encryptedTicketsSold,
        encryptedResaleMarkup: data.encryptedResaleMarkup,
      });

      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Purchase ticket - For static wallet only, MetaMask users use frontend
  app.post("/api/tickets/purchase", async (req, res) => {
    try {
      const data = purchaseTicketSchema.parse(req.body);
      const client = getCotiClient();

      // Get event details
      const event = await storage.getEvent(data.eventId);
      if (!event || !event.blockchainEventId) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if this is the static wallet address
      const isStaticWallet = data.walletAddress.toLowerCase() === client['wallet']?.address?.toLowerCase();
      
      if (!isStaticWallet) {
        return res.status(400).json({ 
          message: "MetaMask users must purchase through frontend transaction",
          useMetaMask: true 
        });
      }

      // Purchase ticket on blockchain using static wallet
      const blockchainTicketId = await client.purchaseTicket(event.blockchainEventId);
      
      if (!blockchainTicketId) {
        return res.status(400).json({ message: "Failed to purchase ticket" });
      }

      // Store ticket in database
      const ticket = await storage.createTicket({
        eventId: data.eventId,
        ownerAddress: data.walletAddress,
        blockchainTicketId,
        verified: true,
        encryptedPurchasePrice: undefined,
        transactionHash: undefined,
      });

      res.json(ticket);
    } catch (error) {
      console.error("Error purchasing ticket:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to purchase ticket" });
    }
  });

  // Record MetaMask ticket purchase
  app.post("/api/tickets/record-purchase", async (req, res) => {
    try {
      const data = recordPurchaseSchema.parse(req.body);

      const ticket = await storage.createTicket({
        eventId: data.eventId,
        ownerAddress: data.walletAddress,
        blockchainTicketId: data.blockchainTicketId,
        verified: true,
        encryptedPurchasePrice: undefined,
        transactionHash: data.transactionHash,
      });

      res.json(ticket);
    } catch (error) {
      console.error("Error recording ticket purchase:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record ticket purchase" });
    }
  });

  // Get tickets by owner
  app.get("/api/tickets/owner/:address", async (req, res) => {
    try {
      const address = req.params.address;
      
      // First get tickets from local storage
      let tickets = await storage.getTicketsByOwner(address);
      
      // If using the connected wallet address, also try to get tickets from blockchain
      const client = getCotiClient();
      if (address === client['wallet']?.address) {
        try {
          const blockchainTicketIds = await client.getMyTickets();
          
          // For each blockchain ticket ID, sync with local storage
          for (const ticketId of blockchainTicketIds) {
            try {
              // Check if we already have this ticket in local storage
              const existingTicket = tickets.find(t => t.blockchainTicketId === ticketId);
              
              if (!existingTicket) {
                // Create new ticket in local storage for blockchain tickets
                // We'll use a default event ID for now since we can't easily map without getTicketInfo
                const events = await storage.getAllEvents();
                const defaultEvent = events[0]; // Use first available event
                
                if (defaultEvent) {
                  const newTicket = await storage.createTicket({
                    eventId: defaultEvent.id,
                    ownerAddress: address,
                    blockchainTicketId: ticketId,
                    encryptedPurchasePrice: "encrypted_ticket_price",
                    transactionHash: null,
                    verified: true,
                  });
                  
                  tickets.push(newTicket);
                }
              }
            } catch (err) {
              console.error(`Error processing ticket ${ticketId}:`, err);
              continue;
            }
          }
        } catch (clientError) {
          console.error("Error fetching tickets from blockchain:", clientError);
        }
      }
      
      // Get event details for each ticket
      const ticketsWithEvents = await Promise.all(
        tickets.map(async (ticket) => {
          const event = await storage.getEvent(ticket.eventId);
          return { ...ticket, event };
        })
      );

      res.json(ticketsWithEvents);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Prove ownership
  app.post("/api/tickets/:id/prove-ownership", async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const ticket = await storage.getTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const client = getCotiClient();
      const proof = await client.proveOwnership(ticket.blockchainTicketId);

      res.json({ proof, verified: proof !== null });
    } catch (error) {
      console.error("Error proving ownership:", error);
      res.status(500).json({ message: "Failed to prove ownership" });
    }
  });

  // Transfer ticket
  app.post("/api/tickets/:id/transfer", async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const data = transferTicketSchema.parse(req.body);
      
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const client = getCotiClient();
      await client.transferTicket(ticket.blockchainTicketId, data.toAddress);

      // Update ticket ownership in database
      const updatedTicket = await storage.updateTicket(ticketId, {
        ownerAddress: data.toAddress,
      });

      res.json(updatedTicket);
    } catch (error) {
      console.error("Error transferring ticket:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to transfer ticket" });
    }
  });

  // Connect wallet with MetaMask address
  app.post("/api/wallet/connect", async (req, res) => {
    try {
      const { address } = req.body;
      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }
      
      // Grant permissions for all existing events to the new address
      try {
        const client = getCotiClient();
        const events = await storage.getAllEvents();
        
        for (const event of events) {
          if (event.blockchainEventId !== null && event.blockchainEventId !== undefined) {
            try {
              console.log(`🔑 Granting permission for event ${event.blockchainEventId} to ${address}...`);
              await client.grantPurchasePermission(event.blockchainEventId, address);
              console.log(`✅ Permission granted for event ${event.blockchainEventId}`);
            } catch (permError) {
              console.log(`ℹ️  Permission for event ${event.blockchainEventId} may already exist`);
            }
          }
        }
      } catch (error) {
        console.log("Warning: Could not grant permissions to all events:", error);
      }
      
      res.json({ success: true, address });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      res.status(500).json({ message: "Failed to connect wallet" });
    }
  });

  // Get balance for specific address
  app.get("/api/wallet/balance/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const client = getCotiClient();
      const balance = await client['provider'].getBalance(address);
      
      res.json({
        balance: (parseFloat(balance.toString()) / 1e18).toFixed(4),
      });
    } catch (error) {
      console.error("Error getting balance:", error);
      res.status(500).json({ message: "Failed to get balance" });
    }
  });

  // Get wallet info (legacy route for backwards compatibility)
  app.get("/api/wallet/info", async (req, res) => {
    try {
      const client = getCotiClient();
      const walletAddress = client['wallet']?.address;
      const balance = await client['provider'].getBalance(walletAddress);
      
      res.json({
        connected: true,
        address: walletAddress,
        balance: balance.toString(),
        network: "COTI Testnet",
      });
    } catch (error) {
      console.error("Error getting wallet info:", error);
      res.status(500).json({ message: "Failed to get wallet info" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
