import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sequencesTable = sqliteTable("sequences", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
