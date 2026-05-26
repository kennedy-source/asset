import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const productionOrdersTable = sqliteTable(
  "production_orders",
  {
    id: integer("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    customerId: integer("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    type: text("type").notNull(), // UNIFORM, EMBROIDERY, PRINTING, CUSTOM_CLOTHING, BULK_ORDER
    status: text("status").notNull().default("PENDING"),
    priority: text("priority").default("NORMAL"), // LOW, NORMAL, HIGH, URGENT
    startDate: text("start_date"),
    dueDate: text("due_date"),
    completedDate: text("completed_date"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    orderNumberIdx: index("production_orders_order_number_idx").on(
      t.orderNumber,
    ),
    createdAtIdx: index("production_orders_created_at_idx").on(t.createdAt),
    updatedAtIdx: index("production_orders_updated_at_idx").on(t.updatedAt),
    customerIdIdx: index("production_orders_customer_id_idx").on(t.customerId),
    statusIdx: index("production_orders_status_idx").on(t.status),
  }),
);

export const insertProductionOrderSchema = createInsertSchema(
  productionOrdersTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductionOrder = z.infer<typeof insertProductionOrderSchema>;
export type ProductionOrder = typeof productionOrdersTable.$inferSelect;
