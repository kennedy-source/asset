import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { salesTable } from "./sales";
import { invoicesTable } from "./invoices";
import { customersTable } from "./customers";

export const paymentsTable = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey(),
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
    userId: integer("user_id"),
    orderId: text("order_id"),
    paymentReference: text("payment_reference"),
    paystackReference: text("paystack_reference"),
    accessCode: text("access_code"),
    amount: money("amount").notNull(),
    currency: text("currency").notNull().default("KES"),
    method: text("method").notNull().default("CASH"),
    paymentMethod: text("payment_method"),
    status: text("status").notNull().default("COMPLETED"),
    paymentStatus: text("payment_status"),
    reference: text("reference").unique(),
    gatewayResponse: text("gateway_response"),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("payments_created_at_idx").on(t.createdAt),
    invoiceIdIdx: index("payments_invoice_id_idx").on(t.invoiceId),
    saleIdIdx: index("payments_sale_id_idx").on(t.saleId),
    customerIdIdx: index("payments_customer_id_idx").on(t.customerId),
    statusIdx: index("payments_status_idx").on(t.status),
    // pesapal fields removed
  }),
);

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
