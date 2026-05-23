import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable, branchesTable } from "./users";
import { suppliersTable } from "./products";

export const expenseCategoriesTable = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  budgetAmount: numeric("budget_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull(),
  paymentMethod: text("payment_method"),
  reference: text("reference"),
  receiptUrl: text("receipt_url"),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  createdBy: integer("created_by").references(() => usersTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id),
  expenseDate: timestamp("expense_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull().default("general"),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export const insertExpenseCategorySchema = createInsertSchema(expenseCategoriesTable).omit({ id: true, createdAt: true });

export type Expense = typeof expensesTable.$inferSelect;
export type ExpenseCategory = typeof expenseCategoriesTable.$inferSelect;
export type Setting = typeof settingsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
