import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { usersTable } from "./users";

export const stockMovementsTable = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    type: text("type").notNull(), // IN, OUT, ADJUSTMENT, RETURN
    quantity: integer("quantity").notNull(),
    reason: text("reason"),
    reference: text("reference"),
    userId: integer("user_id").references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("stock_movements_created_at_idx").on(t.createdAt),
    productIdIdx: index("stock_movements_product_id_idx").on(t.productId),
    userIdIdx: index("stock_movements_user_id_idx").on(t.userId),
    typeIdx: index("stock_movements_type_idx").on(t.type),
  }),
);

export const insertStockMovementSchema = createInsertSchema(
  stockMovementsTable,
).omit({ id: true, createdAt: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
