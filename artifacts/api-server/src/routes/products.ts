// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db";
import { eq, and, lte, ilike, sql, now } from "drizzle-orm";
import { CreateProductBody, ListProductsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

function normalizeProductBody(body: any) {
  const sellingPrice = Number(body?.sellingPrice ?? body?.price ?? 0);
  const buyingPrice = Number(body?.buyingPrice ?? body?.cost_price ?? body?.costPrice ?? 0);
  const stockQuantity = Number(body?.stockQuantity ?? body?.stock_quantity ?? 0);
  const reorderLevel = Number(body?.reorderLevel ?? body?.low_stock_threshold ?? body?.reorder_quantity ?? 5);

  return {
    api: {
      name: body?.name,
      sku: body?.sku || `SKU-${Date.now()}`,
      description: body?.description ?? null,
      price: sellingPrice,
      cost_price: buyingPrice,
      stock_quantity: stockQuantity,
      low_stock_threshold: reorderLevel,
      image_url: body?.imageUrl ?? body?.image_url ?? null,
      is_active: body?.isActive ?? body?.is_active ?? true,
      category_id: body?.categoryId ?? body?.category_id ?? null,
    },
    db: {
      name: body?.name,
      sku: body?.sku || `SKU-${Date.now()}`,
      categoryId: body?.categoryId ?? body?.category_id ?? null,
      description: body?.description ?? null,
      size: body?.size ?? null,
      color: body?.color ?? null,
      material: body?.material ?? null,
      gender: body?.gender ?? null,
      schoolName: body?.schoolName ?? body?.school_name ?? null,
      barcode: body?.barcode ?? null,
      qrCode: body?.qrCode ?? body?.qr_code ?? null,
      brand: body?.brand ?? null,
      fabricType: body?.fabricType ?? body?.fabric_type ?? null,
      ageGroup: body?.ageGroup ?? body?.age_group ?? null,
      weight: body?.weight ? Number(body.weight) : null,
      thumbnailUrl: body?.thumbnailUrl ?? body?.thumbnail_url ?? null,
      discount: Number(body?.discount ?? 0),
      tax: Number(body?.tax ?? 0),
      minimumStock: Number(body?.minimumStock ?? body?.minimum_stock ?? reorderLevel),
      supplierId: body?.supplierId ?? body?.supplier_id ?? null,
      organizationName: body?.organizationName ?? body?.organization_name ?? body?.schoolName ?? body?.school_name ?? null,
      embroideryOption: Boolean(body?.embroideryOption ?? body?.embroidery_option ?? false),
      printingOption: Boolean(body?.printingOption ?? body?.printing_option ?? false),
      tags: Array.isArray(body?.tags) ? body.tags : String(body?.tags ?? "").split(",").map((tag: string) => tag.trim()).filter(Boolean),
      availabilityStatus: body?.availabilityStatus ?? body?.availability_status ?? "available",
      productTypeId: body?.productTypeId ?? body?.product_type_id ?? null,
      seasonalCollection: body?.seasonalCollection ?? body?.seasonal_collection ?? null,
      buyingPrice,
      sellingPrice,
      stockQuantity,
      reorderLevel,
      imageUrl: body?.imageUrl ?? body?.image_url ?? null,
      isActive: body?.isActive ?? body?.is_active ?? true,
    },
  };
}

router.get("/", async (req, res): Promise<void> => {
  const qp = ListProductsQueryParams.safeParse(req.query);
  const { categoryId, search, lowStock } = qp.success ? qp.data : {};
  const { page, limit } = parsePaginationQuery(
    req.query as Record<string, unknown>,
  );
  const pg = resolvePagination({ page, limit });

  const conditions = [];
  if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (lowStock === "true")
    conditions.push(
      lte(productsTable.stockQuantity, productsTable.reorderLevel),
    );
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(productsTable)
    .where(where);

  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      sku: productsTable.sku,
      description: productsTable.description,
      size: productsTable.size,
      color: productsTable.color,
      material: productsTable.material,
      gender: productsTable.gender,
      schoolName: productsTable.schoolName,
      barcode: productsTable.barcode,
      qrCode: productsTable.qrCode,
      brand: productsTable.brand,
      fabricType: productsTable.fabricType,
      ageGroup: productsTable.ageGroup,
      weight: productsTable.weight,
      thumbnailUrl: productsTable.thumbnailUrl,
      discount: productsTable.discount,
      tax: productsTable.tax,
      minimumStock: productsTable.minimumStock,
      supplierId: productsTable.supplierId,
      organizationName: productsTable.organizationName,
      embroideryOption: productsTable.embroideryOption,
      printingOption: productsTable.printingOption,
      tags: productsTable.tags,
      availabilityStatus: productsTable.availabilityStatus,
      productTypeId: productsTable.productTypeId,
      seasonalCollection: productsTable.seasonalCollection,
      buyingPrice: productsTable.buyingPrice,
      sellingPrice: productsTable.sellingPrice,
      stockQuantity: productsTable.stockQuantity,
      reorderLevel: productsTable.reorderLevel,
      imageUrl: productsTable.imageUrl,
      isActive: productsTable.isActive,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(where)
    .orderBy(productsTable.name)
    .limit(pg.limit)
    .offset(pg.offset);

  res.json({
    items: rows,
    page: pg.page,
    limit: pg.limit,
    total: Number(total),
  });
});

router.post("/", async (req, res): Promise<void> => {
  const normalized = normalizeProductBody(req.body);
  const parsed = CreateProductBody.safeParse(normalized.api);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const inserted = await db
    .insert(productsTable)
    .values(normalized.db)
    .returning();
  res.status(201).json({ ...inserted[0], categoryName: null });
});

router.get("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      sku: productsTable.sku,
      description: productsTable.description,
      size: productsTable.size,
      color: productsTable.color,
      material: productsTable.material,
      gender: productsTable.gender,
      schoolName: productsTable.schoolName,
      barcode: productsTable.barcode,
      qrCode: productsTable.qrCode,
      brand: productsTable.brand,
      fabricType: productsTable.fabricType,
      ageGroup: productsTable.ageGroup,
      weight: productsTable.weight,
      thumbnailUrl: productsTable.thumbnailUrl,
      discount: productsTable.discount,
      tax: productsTable.tax,
      minimumStock: productsTable.minimumStock,
      supplierId: productsTable.supplierId,
      organizationName: productsTable.organizationName,
      embroideryOption: productsTable.embroideryOption,
      printingOption: productsTable.printingOption,
      tags: productsTable.tags,
      availabilityStatus: productsTable.availabilityStatus,
      productTypeId: productsTable.productTypeId,
      seasonalCollection: productsTable.seasonalCollection,
      buyingPrice: productsTable.buyingPrice,
      sellingPrice: productsTable.sellingPrice,
      stockQuantity: productsTable.stockQuantity,
      reorderLevel: productsTable.reorderLevel,
      imageUrl: productsTable.imageUrl,
      isActive: productsTable.isActive,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(rows[0]);
});

router.get("/:id/variants", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const result = await db.execute(sql`
    SELECT
      pv.*,
      ps.name AS size_name,
      pc.name AS color_name,
      pc.hex_code,
      m.name AS material_name,
      b.name AS brand_name
    FROM product_variants pv
    LEFT JOIN product_sizes ps ON ps.id = pv.size_id
    LEFT JOIN product_colors pc ON pc.id = pv.color_id
    LEFT JOIN materials m ON m.id = pv.material_id
    LEFT JOIN brands b ON b.id = pv.brand_id
    WHERE pv.product_id = ${id}
    ORDER BY pv.sku
  `);
  res.json({ items: result.rows ?? result });
});

router.post("/:id/variants", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const sku = String(req.body?.sku ?? `VAR-${id}-${Date.now()}`).trim();
  const barcode = String(req.body?.barcode ?? sku).trim();
  const qrCode = String(req.body?.qrCode ?? req.body?.qr_code ?? barcode).trim();
  const result = await db.execute(sql`
    INSERT INTO product_variants (
      product_id, product_type_id, sku, barcode, qr_code, size_id, color_id,
      material_id, brand_id, gender, age_group, season, buying_price,
      selling_price, discount, tax, stock_quantity, minimum_stock,
      availability_status, tags, image_url, thumbnail_url
    )
    VALUES (
      ${id}, ${req.body?.productTypeId ?? req.body?.product_type_id ?? null}, ${sku}, ${barcode}, ${qrCode},
      ${req.body?.sizeId ?? req.body?.size_id ?? null}, ${req.body?.colorId ?? req.body?.color_id ?? null},
      ${req.body?.materialId ?? req.body?.material_id ?? null}, ${req.body?.brandId ?? req.body?.brand_id ?? null},
      ${req.body?.gender ?? null}, ${req.body?.ageGroup ?? req.body?.age_group ?? null}, ${req.body?.season ?? null},
      ${Number(req.body?.buyingPrice ?? req.body?.buying_price ?? 0)}, ${Number(req.body?.sellingPrice ?? req.body?.selling_price ?? 0)},
      ${Number(req.body?.discount ?? 0)}, ${Number(req.body?.tax ?? 0)}, ${Number(req.body?.stockQuantity ?? req.body?.stock_quantity ?? 0)},
      ${Number(req.body?.minimumStock ?? req.body?.minimum_stock ?? 0)}, ${req.body?.availabilityStatus ?? req.body?.availability_status ?? "available"},
      ${Array.isArray(req.body?.tags) ? req.body.tags : []}, ${req.body?.imageUrl ?? req.body?.image_url ?? null}, ${req.body?.thumbnailUrl ?? req.body?.thumbnail_url ?? null}
    )
    RETURNING *
  `);
  res.status(201).json((result.rows ?? result)[0]);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const normalized = normalizeProductBody(req.body);
  const parsed = CreateProductBody.safeParse(normalized.api);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const updatedRows = await db.execute(sql`
      UPDATE products
      SET name = ${normalized.db.name},
          sku = ${normalized.db.sku},
          category_id = ${normalized.db.categoryId},
          description = ${normalized.db.description},
          size = ${normalized.db.size},
          color = ${normalized.db.color},
          material = ${normalized.db.material},
          gender = ${normalized.db.gender},
          school_name = ${normalized.db.schoolName},
          barcode = ${normalized.db.barcode},
          qr_code = ${normalized.db.qrCode},
          brand = ${normalized.db.brand},
          fabric_type = ${normalized.db.fabricType},
          age_group = ${normalized.db.ageGroup},
          weight = ${normalized.db.weight},
          thumbnail_url = ${normalized.db.thumbnailUrl},
          discount = ${normalized.db.discount},
          tax = ${normalized.db.tax},
          minimum_stock = ${normalized.db.minimumStock},
          supplier_id = ${normalized.db.supplierId},
          organization_name = ${normalized.db.organizationName},
          embroidery_option = ${normalized.db.embroideryOption},
          printing_option = ${normalized.db.printingOption},
          tags = ${normalized.db.tags},
          availability_status = ${normalized.db.availabilityStatus},
          product_type_id = ${normalized.db.productTypeId},
          seasonal_collection = ${normalized.db.seasonalCollection},
          buying_price = ${normalized.db.buyingPrice},
          selling_price = ${normalized.db.sellingPrice},
          stock_quantity = ${normalized.db.stockQuantity},
          reorder_level = ${normalized.db.reorderLevel},
          image_url = ${normalized.db.imageUrl},
          is_active = ${normalized.db.isActive},
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);
    const updated = updatedRows.rows ?? updatedRows;
    if (!updated[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...updated[0], categoryName: null });
  } catch (error) {
    console.error("Product update error:", error);
    res.status(500).json({ error: "Failed to update product", details: String(error) });
  }
});

router.delete("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.execute(sql`UPDATE products SET is_active = false, updated_at = now() WHERE id = ${id}`);
  res.json({ success: true });
});

export default router;
