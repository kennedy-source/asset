import { pgTable, text, serial, timestamp, integer, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable, branchesTable } from "./users";

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "purchase", "sale", "adjustment", "return", "transfer", "opening"
]);

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  paymentTerms: text("payment_terms"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).default("0"),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  brand: text("brand"),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  wholesalePrice: numeric("wholesale_price", { precision: 12, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  reorderQuantity: integer("reorder_quantity"),
  unit: text("unit").default("piece"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("16"),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  branchId: integer("branch_id").references(() => branchesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true });

export type Category = typeof categoriesTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
export type Supplier = typeof suppliersTable.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
