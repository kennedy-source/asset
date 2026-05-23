import { Router } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

router.get("/categories", async (req, res) => {
  try {
    const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.sortOrder, categoriesTable.name);
    const productCounts = await db.select({
      categoryId: productsTable.categoryId,
      cnt: count(productsTable.id),
    }).from(productsTable).where(eq(productsTable.isActive, true)).groupBy(productsTable.categoryId);
    const countMap = new Map(productCounts.map(p => [p.categoryId, Number(p.cnt)]));
    return res.json(cats.map(c => ({ ...c, product_count: countMap.get(c.id) ?? 0 })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list categories" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name, description, parent_id, sort_order, is_active } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [cat] = await db.insert(categoriesTable).values({
      name, slug, description, parentId: parent_id, sortOrder: sort_order ?? 0, isActive: is_active ?? true,
    }).returning();
    return res.status(201).json(cat);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create category" });
  }
});

router.patch("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, parent_id, sort_order, is_active } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) { updates.name = name; updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
    if (description !== undefined) updates.description = description;
    if (parent_id !== undefined) updates.parentId = parent_id;
    if (sort_order !== undefined) updates.sortOrder = sort_order;
    if (is_active !== undefined) updates.isActive = is_active;
    const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
    if (!cat) return res.status(404).json({ error: "Category not found" });
    return res.json(cat);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
