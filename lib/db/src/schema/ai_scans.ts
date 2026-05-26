import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { usersTable } from "./users";

export const aiScansTable = sqliteTable(
  "ai_scans",
  {
    id: integer("id").primaryKey(),
    imageUrl: text("image_url"),
    extractedText: text("extracted_text"),
    parsedItemsJson: text("parsed_items_json"),
    detectedTotal: money("detected_total"),
    confidence: money("confidence"),
    status: text("status").notNull().default("PENDING"), // PENDING, CONFIRMED, REJECTED
    createdBy: integer("created_by").references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("ai_scans_created_at_idx").on(t.createdAt),
    createdByIdx: index("ai_scans_created_by_idx").on(t.createdBy),
    statusIdx: index("ai_scans_status_idx").on(t.status),
  }),
);

export const insertAiScanSchema = createInsertSchema(aiScansTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAiScan = z.infer<typeof insertAiScanSchema>;
export type AiScan = typeof aiScansTable.$inferSelect;
