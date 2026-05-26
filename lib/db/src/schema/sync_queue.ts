import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const syncQueueTable = sqliteTable(
  "sync_queue",
  {
    id: integer("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    operation: text("operation").notNull(),
    payload: text("payload"),
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("sync_queue_status_idx").on(t.status),
    entityIdx: index("sync_queue_entity_idx").on(t.entityType, t.entityId),
  }),
);
