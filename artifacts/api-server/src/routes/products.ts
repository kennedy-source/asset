import { Router } from "express";
import { db, productsTable, categoriesTable, stockMovementsTable } from "@workspace/db";
import { eq, like, and, or, lte, sql, count, ilike } from "drizzle-orm";

const router = Router();

function toProduct(p: any, catName?: string) {
  return {
    ...p,
    price: Number(p.price),
    cost_price: p.costPrice ? Number(p.costPrice) : null,
    wholesale_price: p.wholesalePrice ? Number(p.wholesalePrice) : null,
    tax_rate: p.taxRate ? Number(p.taxRate) : null,
    category_name: catName ?? null,
    category_id: p.categoryId,
    supplier_id: p.supplierId,
    stock_quantity: p.stockQuantity,
    reserved_quantity: p.reservedQuantity ?? 0,
    low_stock_threshold: p.lowStockThreshold,
    reorder_quantity: p.reorderQuantity,
    is_active: p.isActive,
    is_featured: p.isFeatured,
    image_url: p.imageUrl,
    created_at: p.createdAt,
  };
}

router.get("/products", async (req, res) => {
  try {
    const { q, category_id, low_stock, is_active, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = Math.min(parseInt(limit), 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (q) conditions.push(or(ilike(productsTable.name, `%${q}%`), ilike(productsTable.sku, `%${q}%`)));
    if (category_id) conditions.push(eq(productsTable.categoryId, parseInt(category_id)));
    if (is_active !== undefined) conditions.push(eq(productsTable.isActive, is_active === "true"));
    if (low_stock === "true") conditions.push(sql`${productsTable.stockQuantity} <= ${productsTable.lowStockThreshold}`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [products, cats, [totalRow]] = await Promise.all([
      db.select().from(productsTable).where(where).limit(limitNum).offset(offset).orderBy(productsTable.name),
      db.select().from(categoriesTable),
      db.select({ total: count() }).from(productsTable).where(where),
    ]);

    const catMap = new Map(cats.map(c => [c.id, c.name]));
    return res.json({
      data: products.map(p => toProduct(p, p.categoryId ? catMap.get(p.categoryId) : undefined)),
      total: Number(totalRow.total),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list products" });
  }
});

router.get("/products/low-stock", async (req, res) => {
  try {
    const products = await db.select().from(productsTable)
      .where(and(eq(productsTable.isActive, true), sql`${productsTable.stockQuantity} <= COALESCE(${productsTable.lowStockThreshold}, 5)`))
      .orderBy(productsTable.stockQuantity);
    return res.json(products.map(p => toProduct(p)));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get low stock" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product) return res.status(404).json({ error: "Product not found" });
    let catName: string | undefined;
    if (product.categoryId) {
      const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)).limit(1);
      catName = cat?.name;
    }
    return res.json(toProduct(product, catName));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get product" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.sku) return res.status(400).json({ error: "Name and SKU required" });
    const [product] = await db.insert(productsTable).values({
      name: body.name, sku: body.sku, barcode: body.barcode,
      categoryId: body.category_id, brand: body.brand, description: body.description,
      price: body.price.toString(), costPrice: body.cost_price?.toString(),
      wholesalePrice: body.wholesale_price?.toString(),
      stockQuantity: body.stock_quantity ?? 0,
      lowStockThreshold: body.low_stock_threshold ?? 5,
      reorderQuantity: body.reorder_quantity,
      unit: body.unit ?? "piece",
      imageUrl: body.image_url,
      isActive: body.is_active ?? true, isFeatured: body.is_featured ?? false,
      taxRate: body.tax_rate?.toString() ?? "16",
      supplierId: body.supplier_id,
    }).returning();
    return res.status(201).json(toProduct(product));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create product" });
  }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.price !== undefined) updates.price = body.price.toString();
    if (body.cost_price !== undefined) updates.costPrice = body.cost_price?.toString();
    if (body.stock_quantity !== undefined) updates.stockQuantity = body.stock_quantity;
    if (body.is_active !== undefined) updates.isActive = body.is_active;
    if (body.category_id !== undefined) updates.categoryId = body.category_id;
    if (body.low_stock_threshold !== undefined) updates.lowStockThreshold = body.low_stock_threshold;
    if (body.image_url !== undefined) updates.imageUrl = body.image_url;
    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json(toProduct(product));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

router.post("/products/:id/adjust-stock", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quantity, reason, notes } = req.body as { quantity: number; reason: string; notes?: string };
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product) return res.status(404).json({ error: "Product not found" });
    const newQty = product.stockQuantity + quantity;
    await db.update(productsTable).set({ stockQuantity: newQty }).where(eq(productsTable.id, id));
    await db.insert(stockMovementsTable).values({
      productId: id, type: "adjustment", quantity,
      notes: `${reason}${notes ? ": " + notes : ""}`,
    });
    const [updated] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    return res.json(toProduct(updated!));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to adjust stock" });
  }
});

router.get("/products/:id/stock-movements", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const movements = await db.select().from(stockMovementsTable)
      .where(eq(stockMovementsTable.productId, id))
      .orderBy(sql`${stockMovementsTable.createdAt} DESC`)
      .limit(100);
    return res.json(movements.map(m => ({
      id: m.id, type: m.type, quantity: m.quantity,
      reference_type: m.referenceType, reference_id: m.referenceId,
      notes: m.notes, created_by: m.createdBy, created_at: m.createdAt,
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get stock movements" });
  }
});

export default router;
