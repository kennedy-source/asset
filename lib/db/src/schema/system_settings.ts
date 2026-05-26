import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const systemSettingsTable = sqliteTable("system_settings", {
  id: integer("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const notificationsTable = systemSettingsTable;
