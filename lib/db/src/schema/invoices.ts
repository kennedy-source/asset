import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable, branchesTable } from "./users";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const invoiceStatusEnum = pgEnum("invoice_status", ["unpaid", "partial", "paid", "voided"]);
export const quotationStatusEnum = pgEnum("quotation_status", ["draft", "sent", "accepted", "rejected", "expired"]);

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  cashierId: integer("cashier_id").references(() => usersTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: invoiceStatusEnum("payment_status").notNull().default("unpaid"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  notes: text("notes"),
  terms: text("terms"),
  footer: text("footer"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const invoiceItemsTable = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  description: text("description").notNull(),
  productId: integer("product_id").references(() => productsTable.id),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoicePaymentsTable = pgTable("invoice_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quotationsTable = pgTable("quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: text("quotation_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  cashierId: integer("cashier_id").references(() => usersTable.id),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  status: quotationStatusEnum("status").notNull().default("draft"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  notes: text("notes"),
  terms: text("terms"),
  convertedToInvoiceId: integer("converted_to_invoice_id").references(() => invoicesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const quotationItemsTable = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotationsTable.id),
  description: text("description").notNull(),
  productId: integer("product_id").references(() => productsTable.id),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Invoice = typeof invoicesTable.$inferSelect;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
export type Quotation = typeof quotationsTable.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
