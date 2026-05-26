import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { usersTable } from "./users";

export const expensesTable = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    category: text("category"),
    amount: money("amount").notNull(),
    paymentMethod: text("payment_method"),
    reference: text("reference"),
    description: text("description"),
    createdBy: integer("created_by").references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("expenses_created_at_idx").on(t.createdAt),
    createdByIdx: index("expenses_created_by_idx").on(t.createdBy),
    categoryIdx: index("expenses_category_idx").on(t.category),
  }),
);

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
