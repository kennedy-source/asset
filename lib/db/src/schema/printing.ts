import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { customersTable } from "./customers";

export const printingJobsTable = sqliteTable(
  "printing_jobs",
  {
    id: integer("id").primaryKey(),
    jobNumber: text("job_number").notNull().unique(),
    customerId: integer("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    designImageUrl: text("design_image_url"),
    printType: text("print_type"), // SCREEN_PRINTING, HEAT_PRESS, VINYL, SUBLIMATION, DTF, OTHER
    garmentType: text("garment_type"),
    position: text("position"),
    colors: text("colors"),
    quantity: integer("quantity").notNull().default(1),
    pricePerItem: money("price_per_item").notNull().default(0),
    total: money("total").notNull().default(0),
    status: text("status").notNull().default("PENDING"),
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
    jobNumberIdx: index("printing_jobs_job_number_idx").on(t.jobNumber),
    createdAtIdx: index("printing_jobs_created_at_idx").on(t.createdAt),
    updatedAtIdx: index("printing_jobs_updated_at_idx").on(t.updatedAt),
    customerIdIdx: index("printing_jobs_customer_id_idx").on(t.customerId),
    statusIdx: index("printing_jobs_status_idx").on(t.status),
  }),
);

export const insertPrintingJobSchema = createInsertSchema(
  printingJobsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrintingJob = z.infer<typeof insertPrintingJobSchema>;
export type PrintingJob = typeof printingJobsTable.$inferSelect;
