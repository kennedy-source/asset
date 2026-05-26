import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { money } from "./_columns";
import { categoriesTable } from "./categories";
import { productsTable } from "./products";
import { suppliersTable } from "./suppliers";

export const subcategoriesTable = sqliteTable(
  "subcategories",
  {
    id: integer("id").primaryKey(),
    categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    categoryIdIdx: index("subcategories_category_id_idx").on(t.categoryId),
    slugIdx: index("subcategories_slug_idx").on(t.slug),
  }),
);

export const productTypesTable = sqliteTable(
  "product_types",
  {
    id: integer("id").primaryKey(),
    categoryId: integer("category_id").references(() => categoriesTable.id),
    subcategoryId: integer("subcategory_id").references(() => subcategoriesTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    categoryIdIdx: index("product_types_category_id_idx").on(t.categoryId),
    subcategoryIdIdx: index("product_types_subcategory_id_idx").on(t.subcategoryId),
    slugIdx: index("product_types_slug_idx").on(t.slug),
  }),
);

export const brandsTable = sqliteTable("brands", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const materialsTable = sqliteTable("materials", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  fabricType: text("fabric_type"),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const productSizesTable = sqliteTable("product_sizes", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  sizeType: text("size_type").notNull(),
  measurementJson: text("measurement_json"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const productColorsTable = sqliteTable("product_colors", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  hexCode: text("hex_code").notNull().default("#000000"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const productVariantsTable = sqliteTable(
  "product_variants",
  {
    id: integer("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => productsTable.id),
    productTypeId: integer("product_type_id").references(() => productTypesTable.id),
    sku: text("sku").notNull().unique(),
    barcode: text("barcode"),
    qrCode: text("qr_code"),
    sizeId: integer("size_id").references(() => productSizesTable.id),
    colorId: integer("color_id").references(() => productColorsTable.id),
    materialId: integer("material_id").references(() => materialsTable.id),
    brandId: integer("brand_id").references(() => brandsTable.id),
    gender: text("gender"),
    ageGroup: text("age_group"),
    season: text("season"),
    buyingPrice: money("buying_price").notNull().default(0),
    sellingPrice: money("selling_price").notNull().default(0),
    discount: money("discount").notNull().default(0),
    tax: money("tax").notNull().default(0),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    minimumStock: integer("minimum_stock").notNull().default(0),
    availabilityStatus: text("availability_status").notNull().default("available"),
    tags: text("tags"),
    imageUrl: text("image_url"),
    thumbnailUrl: text("thumbnail_url"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    productIdIdx: index("product_variants_product_id_idx").on(t.productId),
    productTypeIdIdx: index("product_variants_product_type_id_idx").on(t.productTypeId),
    skuIdx: index("product_variants_sku_idx").on(t.sku),
    barcodeIdx: index("product_variants_barcode_idx").on(t.barcode),
  }),
);

export const inventoryTable = sqliteTable(
  "inventory",
  {
    id: integer("id").primaryKey(),
    productId: integer("product_id").references(() => productsTable.id),
    variantId: integer("variant_id").references(() => productVariantsTable.id),
    supplierId: integer("supplier_id").references(() => suppliersTable.id),
    branchName: text("branch_name").notNull().default("Main Branch"),
    warehouseName: text("warehouse_name").notNull().default("Main Warehouse"),
    batchNumber: text("batch_number"),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    quantityReserved: integer("quantity_reserved").notNull().default(0),
    minimumStock: integer("minimum_stock").notNull().default(0),
    reorderPoint: integer("reorder_point").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    productIdIdx: index("inventory_product_id_idx").on(t.productId),
    variantIdIdx: index("inventory_variant_id_idx").on(t.variantId),
    branchIdx: index("inventory_branch_idx").on(t.branchName),
  }),
);

export const insertSubcategorySchema = createInsertSchema(subcategoriesTable).omit({ id: true, createdAt: true });
export const insertProductTypeSchema = createInsertSchema(productTypesTable).omit({ id: true, createdAt: true });
export const insertBrandSchema = createInsertSchema(brandsTable).omit({ id: true, createdAt: true });
export const insertMaterialSchema = createInsertSchema(materialsTable).omit({ id: true, createdAt: true });
export const insertProductSizeSchema = createInsertSchema(productSizesTable).omit({ id: true });
export const insertProductColorSchema = createInsertSchema(productColorsTable).omit({ id: true });
export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInventorySchema = createInsertSchema(inventoryTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Subcategory = typeof subcategoriesTable.$inferSelect;
export type ProductType = typeof productTypesTable.$inferSelect;
export type Brand = typeof brandsTable.$inferSelect;
export type Material = typeof materialsTable.$inferSelect;
export type ProductSize = typeof productSizesTable.$inferSelect;
export type ProductColor = typeof productColorsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
export type Inventory = typeof inventoryTable.$inferSelect;

export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type InsertProductType = z.infer<typeof insertProductTypeSchema>;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type InsertProductSize = z.infer<typeof insertProductSizeSchema>;
export type InsertProductColor = z.infer<typeof insertProductColorSchema>;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
