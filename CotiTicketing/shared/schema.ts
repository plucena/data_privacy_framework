import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  location: text("location").notNull(),
  eventDate: timestamp("event_date").notNull(),
  organizerAddress: text("organizer_address").notNull(),
  contractAddress: text("contract_address"),
  blockchainEventId: integer("blockchain_event_id"),
  encryptedPrice: text("encrypted_price"),
  encryptedTotalSupply: text("encrypted_total_supply"),
  encryptedTicketsSold: text("encrypted_tickets_sold"),
  resaleAllowed: boolean("resale_allowed").default(false),
  encryptedResaleMarkup: text("encrypted_resale_markup"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  ownerAddress: text("owner_address").notNull(),
  blockchainTicketId: integer("blockchain_ticket_id").notNull(),
  encryptedPurchasePrice: text("encrypted_purchase_price"),
  transactionHash: text("transaction_hash"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
}).extend({
  eventDate: z.string().transform((str) => new Date(str)),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
