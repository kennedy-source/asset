// @ts-nocheck
import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeBody(body: any) {
  const name = String(body?.name ?? "").trim();
  const slug = String(body?.slug ?? slugify(name)).trim();
  return {
    name,
    slug,
    description: body?.description ? String(body.description) : null,
    parentId: body?.parentId ?? body?.parent_id ?? null,
    kind: body?.kind ? String(body.kind) : "category",
    sortOrder: Number(body?.sortOrder ?? body?.sort_order ?? 0),
    isActive: body?.isActive ?? body?.is_active ?? true,
  };
}

function toCamel(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parent_id,
    parent_id: row.parent_id,
    kind: row.kind ?? "category",
    level: row.level ?? 0,
    path: row.path,
    sortOrder: row.sort_order ?? 0,
    sort_order: row.sort_order ?? 0,
    isActive: row.is_active,
    is_active: row.is_active,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

function buildTree(rows: any[]) {
  const byId = new Map(rows.map((row) => [row.id, { ...toCamel(row), children: [] }]));
  const roots: any[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

router.get("/", async (_req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT * FROM categories ORDER BY level ASC, sort_order ASC, name ASC`,
  );
  res.json(rows.map(toCamel));
});

router.get("/hierarchy", async (_req, res): Promise<void> => {
  const [{ rows: categoryRows }, { rows: subcategoryRows }, { rows: productTypeRows }] = await Promise.all([
    pool.query(`SELECT * FROM categories WHERE COALESCE(kind, 'category') = 'category' ORDER BY sort_order ASC, name ASC`),
    pool.query(`SELECT * FROM subcategories ORDER BY sort_order ASC, name ASC`),
    pool.query(`SELECT * FROM product_types ORDER BY sort_order ASC, name ASC`),
  ]);

  const subByCategory = new Map<number, any[]>();
  for (const row of subcategoryRows) {
    const list = subByCategory.get(row.category_id) ?? [];
    list.push({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      productTypes: [],
    });
    subByCategory.set(row.category_id, list);
  }

  const typesWithoutSub = new Map<number, any[]>();
  for (const type of productTypeRows) {
    const item = {
      id: type.id,
      categoryId: type.category_id,
      subcategoryId: type.subcategory_id,
      name: type.name,
      slug: type.slug,
      description: type.description,
    };
    if (type.subcategory_id) {
      for (const subList of subByCategory.values()) {
        const sub = subList.find((candidate) => candidate.id === type.subcategory_id);
        if (sub) {
          sub.productTypes.push(item);
          break;
        }
      }
    } else if (type.category_id) {
      const list = typesWithoutSub.get(type.category_id) ?? [];
      list.push(item);
      typesWithoutSub.set(type.category_id, list);
    }
  }

  res.json({
    items: categoryRows.map((row) => ({
      ...toCamel(row),
      subcategories: subByCategory.get(row.id) ?? [],
      productTypes: typesWithoutSub.get(row.id) ?? [],
    })),
  });
});

router.get("/meta", async (_req, res): Promise<void> => {
  const [sizes, colors, materials, brands, productTypes] = await Promise.all([
    pool.query(`SELECT * FROM product_sizes WHERE is_active = true ORDER BY sort_order ASC, name ASC`),
    pool.query(`SELECT * FROM product_colors WHERE is_active = true ORDER BY name ASC`),
    pool.query(`SELECT * FROM materials WHERE is_active = true ORDER BY name ASC`),
    pool.query(`SELECT * FROM brands WHERE is_active = true ORDER BY name ASC`),
    pool.query(`SELECT * FROM product_types WHERE is_active = true ORDER BY name ASC`),
  ]);
  res.json({
    sizes: sizes.rows,
    colors: colors.rows,
    materials: materials.rows,
    brands: brands.rows,
    productTypes: productTypes.rows,
    genders: ["boys", "girls", "male", "female", "unisex", "kids"],
    ageGroups: ["kindergarten", "primary", "secondary", "college", "adult", "custom"],
    seasons: ["back-to-school", "rainy-season", "cold-season", "graduation", "sports-season", "all-season"],
    tags: ["uniform", "custom-made", "embroidery-ready", "printing-ready", "low-stock-alert", "school-approved"],
  });
});

router.post("/", async (req, res): Promise<void> => {
  const body = normalizeBody(req.body);
  if (!body.name || !body.slug) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const level = body.parentId ? 1 : 0;
  const parent = body.parentId
    ? (await pool.query(`SELECT path, slug FROM categories WHERE id = $1`, [body.parentId])).rows[0]
    : null;
  const path = parent ? `${parent.path ?? parent.slug}/${body.slug}` : body.slug;
  const { rows } = await pool.query(
    `INSERT INTO categories (name, slug, description, parent_id, kind, level, path, sort_order, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       parent_id = EXCLUDED.parent_id,
       kind = EXCLUDED.kind,
       level = EXCLUDED.level,
       path = EXCLUDED.path,
       sort_order = EXCLUDED.sort_order,
       is_active = EXCLUDED.is_active
     RETURNING *`,
    [body.name, body.slug, body.description, body.parentId, body.kind, level, path, body.sortOrder, body.isActive],
  );
  res.status(201).json(toCamel(rows[0]));
});

router.patch("/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const current = (await pool.query(`SELECT * FROM categories WHERE id = $1`, [id])).rows[0];
  if (!current) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const body = normalizeBody({ ...current, ...req.body });
  const level = body.parentId ? 1 : 0;
  const parent = body.parentId
    ? (await pool.query(`SELECT path, slug FROM categories WHERE id = $1`, [body.parentId])).rows[0]
    : null;
  const path = parent ? `${parent.path ?? parent.slug}/${body.slug}` : body.slug;
  const { rows } = await pool.query(
    `UPDATE categories
     SET name = $1, slug = $2, description = $3, parent_id = $4, kind = $5, level = $6, path = $7, sort_order = $8, is_active = $9
     WHERE id = $10
     RETURNING *`,
    [body.name, body.slug, body.description, body.parentId, body.kind, level, path, body.sortOrder, body.isActive, id],
  );
  res.json(toCamel(rows[0]));
});

router.delete("/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await pool.query(`UPDATE categories SET is_active = false WHERE id = $1`, [id]);
  res.json({ success: true });
});

export default router;
