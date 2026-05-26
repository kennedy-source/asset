import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { customersTable } from "./customers";

export const embroideryJobsTable = sqliteTable(
  "embroidery_jobs",
  {
    id: integer("id").primaryKey(),
    jobNumber: text("job_number").notNull().unique(),
    customerId: integer("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    logoImageUrl: text("logo_image_url"),
    garmentType: text("garment_type"),
    logoPosition: text("logo_position"),
    threadColors: text("thread_colors"),
    stitchCount: integer("stitch_count"),
    quantity: integer("quantity").notNull().default(1),
    pricePerItem: money("price_per_item").notNull().default(0),
    total: money("total").notNull().default(0),
    status: text("status").notNull().default("PENDING"), // PENDING, DESIGNING, APPROVED, IN_PROGRESS, COMPLETED, DELIVERED, CANCELLED
    assignedTo: text("assigned_to"),
    dueDate: text("due_date"),
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
    jobNumberIdx: index("embroidery_jobs_job_number_idx").on(t.jobNumber),
    createdAtIdx: index("embroidery_jobs_created_at_idx").on(t.createdAt),
    updatedAtIdx: index("embroidery_jobs_updated_at_idx").on(t.updatedAt),
    customerIdIdx: index("embroidery_jobs_customer_id_idx").on(t.customerId),
    statusIdx: index("embroidery_jobs_status_idx").on(t.status),
  }),
);

export const insertEmbroideryJobSchema = createInsertSchema(
  embroideryJobsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmbroideryJob = z.infer<typeof insertEmbroideryJobSchema>;
export type EmbroideryJob = typeof embroideryJobsTable.$inferSelect;
