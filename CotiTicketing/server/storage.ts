import { users, events, tickets, type User, type InsertUser, type Event, type InsertEvent, type Ticket, type InsertTicket } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Events
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  
  // Tickets
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketsByOwner(ownerAddress: string): Promise<Ticket[]>;
  getTicketsByEvent(eventId: number): Promise<Ticket[]>;
  updateTicket(id: number, updates: Partial<InsertTicket>): Promise<Ticket | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private events: Map<number, Event>;
  private tickets: Map<number, Ticket>;
  private currentUserId: number;
  private currentEventId: number;
  private currentTicketId: number;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.tickets = new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
    this.currentTicketId = 1;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Events
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const event: Event = { 
      ...insertEvent, 
      id,
      description: insertEvent.description || null,
      contractAddress: insertEvent.contractAddress || null,
      blockchainEventId: insertEvent.blockchainEventId || null,
      encryptedPrice: insertEvent.encryptedPrice || null,
      encryptedTotalSupply: insertEvent.encryptedTotalSupply || null,
      encryptedTicketsSold: insertEvent.encryptedTicketsSold || null,
      encryptedResaleMarkup: insertEvent.encryptedResaleMarkup || null,
      resaleAllowed: insertEvent.resaleAllowed || false,
      createdAt: new Date()
    };
    this.events.set(id, event);
    return event;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  // Tickets
  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = this.currentTicketId++;
    const ticket: Ticket = { 
      ...insertTicket, 
      id,
      encryptedPurchasePrice: insertTicket.encryptedPurchasePrice || null,
      transactionHash: insertTicket.transactionHash || null,
      verified: insertTicket.verified || false,
      createdAt: new Date()
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketsByOwner(ownerAddress: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.ownerAddress.toLowerCase() === ownerAddress.toLowerCase()
    );
  }

  async getTicketsByEvent(eventId: number): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.eventId === eventId
    );
  }

  async updateTicket(id: number, updates: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    
    const updatedTicket = { ...ticket, ...updates };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }
}

export const storage = new MemStorage();
