import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable, branchesTable } from "./users";
import { customersTable } from "./customers";

export const jobStatusEnum = pgEnum("job_status", [
  "pending", "quoted", "confirmed", "in_progress", "quality_check", "ready", "delivered", "cancelled"
]);
export const jobPriorityEnum = pgEnum("job_priority", ["low", "normal", "high", "urgent"]);

export const embroideryJobsTable = pgTable("embroidery_jobs", {
  id: serial("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  schoolName: text("school_name"),
  companyName: text("company_name"),
  contactPerson: text("contact_person"),
  contactPhone: text("contact_phone"),
  badgeImageUrl: text("badge_image_url"),
  badgeDescription: text("badge_description"),
  garmentType: text("garment_type"),
  garmentColor: text("garment_color"),
  threadColors: text("thread_colors"),
  placement: text("placement"),
  widthCm: numeric("width_cm", { precision: 6, scale: 2 }),
  heightCm: numeric("height_cm", { precision: 6, scale: 2 }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  depositPaid: numeric("deposit_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  priority: jobPriorityEnum("priority").notNull().default("normal"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  createdBy: integer("created_by").references(() => usersTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const printingJobsTable = pgTable("printing_jobs", {
  id: serial("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customersTable.id),
  designUrl: text("design_url"),
  designDescription: text("design_description"),
  printType: text("print_type"),
  garmentType: text("garment_type"),
  garmentColor: text("garment_color"),
  printColor: text("print_color"),
  printSize: text("print_size"),
  placement: text("placement"),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  depositPaid: numeric("deposit_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  priority: jobPriorityEnum("priority").notNull().default("normal"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  createdBy: integer("created_by").references(() => usersTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const jobStatusHistoryTable = pgTable("job_status_history", {
  id: serial("id").primaryKey(),
  jobType: text("job_type").notNull(),
  jobId: integer("job_id").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  notes: text("notes"),
  changedBy: integer("changed_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmbroideryJobSchema = createInsertSchema(embroideryJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPrintingJobSchema = createInsertSchema(printingJobsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type EmbroideryJob = typeof embroideryJobsTable.$inferSelect;
export type PrintingJob = typeof printingJobsTable.$inferSelect;
export type InsertEmbroideryJob = z.infer<typeof insertEmbroideryJobSchema>;
export type InsertPrintingJob = z.infer<typeof insertPrintingJobSchema>;
