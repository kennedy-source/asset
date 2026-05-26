import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { categoriesTable } from "./categories";

export const productsTable = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    categoryId: integer("category_id").references(() => categoriesTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    sku: text("sku"),
    description: text("description"),
    size: text("size"),
    color: text("color"),
    material: text("material"),
    gender: text("gender"),
    schoolName: text("school_name"),
    barcode: text("barcode"),
    qrCode: text("qr_code"),
    brand: text("brand"),
    fabricType: text("fabric_type"),
    ageGroup: text("age_group"),
    weight: money("weight"),
    thumbnailUrl: text("thumbnail_url"),
    discount: money("discount").notNull().default(0),
    tax: money("tax").notNull().default(0),
    minimumStock: integer("minimum_stock").notNull().default(0),
    supplierId: integer("supplier_id"),
    organizationName: text("organization_name"),
    embroideryOption: integer("embroidery_option", { mode: "boolean" }).notNull().default(false),
    printingOption: integer("printing_option", { mode: "boolean" }).notNull().default(false),
    tags: text("tags"),
    availabilityStatus: text("availability_status").notNull().default("available"),
    productTypeId: integer("product_type_id"),
    seasonalCollection: text("seasonal_collection"),
    buyingPrice: money("buying_price").notNull().default(0),
    sellingPrice: money("selling_price").notNull().default(0),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    reorderLevel: integer("reorder_level").notNull().default(5),
    imageUrl: text("image_url"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    createdAtIdx: index("products_created_at_idx").on(t.createdAt),
    updatedAtIdx: index("products_updated_at_idx").on(t.updatedAt),
    categoryIdIdx: index("products_category_id_idx").on(t.categoryId),
    isActiveIdx: index("products_is_active_idx").on(t.isActive),
    skuIdx: index("products_sku_idx").on(t.sku),
  }),
);

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
