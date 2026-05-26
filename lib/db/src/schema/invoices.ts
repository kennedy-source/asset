import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { productsTable } from "./products";
import { money } from "./_columns";

export const invoicesTable = sqliteTable("invoices", {
  id: integer("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  quotationId: integer("quotation_id"),
  subtotal: money("subtotal").notNull().default(0),
  discount: money("discount").notNull().default(0),
  tax: money("tax").notNull().default(0),
  total: money("total").notNull().default(0),
  amountPaid: money("amount_paid").notNull().default(0),
  balance: money("balance").notNull().default(0),
  status: text("status").notNull().default("UNPAID"),
  dueDate: text("due_date"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  invoiceNumberIdx: index("invoices_invoice_number_idx").on(t.invoiceNumber),
  customerIdIdx: index("invoices_customer_id_idx").on(t.customerId),
  createdAtIdx: index("invoices_created_at_idx").on(t.createdAt),
  statusIdx: index("invoices_status_idx").on(t.status),
}));

export const invoiceItemsTable = sqliteTable("invoice_items", {
  id: integer("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  itemName: text("item_name"),
  description: text("description").notNull(),
  productId: integer("product_id").references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: money("unit_price").notNull(),
  total: money("total").notNull(),
});

export const quotationsTable = sqliteTable("quotations", {
  id: integer("id").primaryKey(),
  quotationNumber: text("quotation_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  subtotal: money("subtotal").notNull().default(0),
  discount: money("discount").notNull().default(0),
  tax: money("tax").notNull().default(0),
  total: money("total").notNull().default(0),
  status: text("status").notNull().default("DRAFT"),
  validUntil: text("valid_until"),
  notes: text("notes"),
  convertedToInvoiceId: integer("converted_to_invoice_id").references(() => invoicesTable.id),
  createdBy: integer("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  quotationNumberIdx: index("quotations_quotation_number_idx").on(t.quotationNumber),
  customerIdIdx: index("quotations_customer_id_idx").on(t.customerId),
  createdAtIdx: index("quotations_created_at_idx").on(t.createdAt),
  statusIdx: index("quotations_status_idx").on(t.status),
}));

export const quotationItemsTable = sqliteTable("quotation_items", {
  id: integer("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotationsTable.id),
  itemName: text("item_name"),
  description: text("description").notNull(),
  productId: integer("product_id").references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: money("unit_price").notNull(),
  total: money("total").notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Invoice = typeof invoicesTable.$inferSelect;
export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
export type Quotation = typeof quotationsTable.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
