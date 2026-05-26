import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { customersTable } from "./customers";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const salesTable = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey(),
    saleNumber: text("sale_number").notNull().unique(),
    customerId: integer("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    subtotal: money("subtotal").notNull().default(0),
    discount: money("discount").notNull().default(0),
    tax: money("tax").notNull().default(0),
    total: money("total").notNull().default(0),
    amountPaid: money("amount_paid").notNull().default(0),
    balance: money("balance").notNull().default(0),
    paymentStatus: text("payment_status").notNull().default("PENDING"), // PENDING, PAID, PARTIAL
    paymentMethod: text("payment_method").notNull().default("CASH"),
    cashierId: integer("cashier_id").references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    saleNumberIdx: index("sales_sale_number_idx").on(t.saleNumber),
    createdAtIdx: index("sales_created_at_idx").on(t.createdAt),
    customerIdIdx: index("sales_customer_id_idx").on(t.customerId),
    cashierIdIdx: index("sales_cashier_id_idx").on(t.cashierId),
    paymentStatusIdx: index("sales_payment_status_idx").on(t.paymentStatus),
  }),
);

export const saleItemsTable = sqliteTable(
  "sale_items",
  {
    id: integer("id").primaryKey(),
    saleId: integer("sale_id")
      .notNull()
      .references(() => salesTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    quantity: integer("quantity").notNull(),
    unitPrice: money("unit_price").notNull(),
    total: money("total").notNull(),
  },
  (t) => ({
    saleIdIdx: index("sale_items_sale_id_idx").on(t.saleId),
    productIdIdx: index("sale_items_product_id_idx").on(t.productId),
  }),
);

export const insertSaleSchema = createInsertSchema(salesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;

export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({
  id: true,
});
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItemsTable.$inferSelect;
