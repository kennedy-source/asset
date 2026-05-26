import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { salesTable } from "./sales";
import { invoicesTable } from "./invoices";
import { customersTable } from "./customers";

export const transactionsTable = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    saleId: integer("sale_id").references(() => salesTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    invoiceId: integer("invoice_id").references(() => invoicesTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    customerId: integer("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    amount: money("amount").notNull(),
    currency: text("currency").notNull().default("NGN"),
    method: text("method").notNull().default("PAYSTACK"),
    status: text("status").notNull().default("PENDING"),
    paystackAuthorizationUrl: text("paystack_authorization_url"),
    paystackAccessCode: text("paystack_access_code"),
    paystackData: text("paystack_data"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    referenceIdx: index("transactions_reference_idx").on(t.reference),
    saleIdIdx: index("transactions_sale_id_idx").on(t.saleId),
    invoiceIdIdx: index("transactions_invoice_id_idx").on(t.invoiceId),
    customerIdIdx: index("transactions_customer_id_idx").on(t.customerId),
    statusIdx: index("transactions_status_idx").on(t.status),
  }),
);

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
