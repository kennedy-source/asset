import { pgTable, text, serial, timestamp, integer, boolean, numeric, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable, branchesTable } from "./users";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const paymentMethodEnum = pgEnum("payment_method", ["cash", "mpesa", "card", "bank", "credit", "split"]);
export const paymentStatusEnum = pgEnum("payment_status", ["unpaid", "partial", "paid", "voided"]);

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleNumber: text("sale_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  cashierId: integer("cashier_id").references(() => usersTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountType: text("discount_type"),
  discountValue: numeric("discount_value", { precision: 12, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
  changeGiven: numeric("change_given", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("paid"),
  notes: text("notes"),
  receiptPrinted: boolean("receipt_printed").default(false),
  voided: boolean("voided").notNull().default(false),
  voidedBy: integer("voided_by").references(() => usersTable.id),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => salesTable.id),
  productId: integer("product_id").references(() => productsTable.id),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({ id: true, createdAt: true });
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
