import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { paymentsTable } from "./payments";

export const refundsTable = sqliteTable(
  "refunds",
  {
    id: integer("id").primaryKey(),
    paymentId: integer("payment_id").references(() => paymentsTable.id),
    transactionReference: text("transaction_reference"),
    amount: money("amount").notNull(),
    currency: text("currency").notNull().default("KES"),
    reason: text("reason"),
    status: text("status").notNull().default("pending"),
    gatewayResponse: text("gateway_response"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    paymentIdIdx: index("refunds_payment_id_idx").on(t.paymentId),
    transactionReferenceIdx: index("refunds_transaction_reference_idx").on(t.transactionReference),
    statusIdx: index("refunds_status_idx").on(t.status),
  }),
);

export const paymentLogsTable = sqliteTable(
  "payment_logs",
  {
    id: integer("id").primaryKey(),
    paymentId: integer("payment_id").references(() => paymentsTable.id),
    transactionReference: text("transaction_reference"),
    eventType: text("event_type").notNull(),
    message: text("message"),
    payload: text("payload"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    paymentIdIdx: index("payment_logs_payment_id_idx").on(t.paymentId),
    transactionReferenceIdx: index("payment_logs_transaction_reference_idx").on(t.transactionReference),
    eventTypeIdx: index("payment_logs_event_type_idx").on(t.eventType),
  }),
);

export const webhookEventsTable = sqliteTable(
  "webhook_events",
  {
    id: integer("id").primaryKey(),
    provider: text("provider").notNull().default("paystack"),
    eventId: text("event_id"),
    eventType: text("event_type").notNull(),
    reference: text("reference"),
    signature: text("signature"),
    payload: text("payload"),
    processedAt: integer("processed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    providerIdx: index("webhook_events_provider_idx").on(t.provider),
    referenceIdx: index("webhook_events_reference_idx").on(t.reference),
    eventTypeIdx: index("webhook_events_event_type_idx").on(t.eventType),
  }),
);

export const insertRefundSchema = createInsertSchema(refundsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentLogSchema = createInsertSchema(paymentLogsTable).omit({ id: true, createdAt: true });
export const insertWebhookEventSchema = createInsertSchema(webhookEventsTable).omit({ id: true, createdAt: true });

export type Refund = typeof refundsTable.$inferSelect;
export type PaymentLog = typeof paymentLogsTable.$inferSelect;
export type WebhookEvent = typeof webhookEventsTable.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type InsertPaymentLog = z.infer<typeof insertPaymentLogSchema>;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
