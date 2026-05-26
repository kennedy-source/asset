import { Router } from "express";
import { db, productsTable, stockMovementsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const toDbType: Record<string, string> = {
  IN: "purchase",
  OUT: "sale",
  ADJUSTMENT: "adjustment",
  RETURN: "return",
};

const toApiType = (type: string) => {
  const normalized = String(type).toLowerCase();
  if (normalized === "purchase" || normalized === "in") return "IN";
  if (normalized === "sale" || normalized === "out") return "OUT";
  if (normalized === "return") return "RETURN";
  return "ADJUSTMENT";
};

router.get("/", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: stockMovementsTable.id,
      productId: stockMovementsTable.productId,
      productName: productsTable.name,
      type: stockMovementsTable.type,
      quantity: stockMovementsTable.quantity,
      reason: stockMovementsTable.reason,
      reference: stockMovementsTable.reference,
      userId: stockMovementsTable.userId,
      createdAt: stockMovementsTable.createdAt,
    })
    .from(stockMovementsTable)
    .leftJoin(productsTable, eq(stockMovementsTable.productId, productsTable.id))
    .orderBy(sql`${stockMovementsTable.createdAt} DESC`)
    .limit(200);

  res.json(rows.map((row) => ({ ...row, type: toApiType(row.type) })));
});

router.post("/", async (req, res): Promise<void> => {
  const productId = Number(req.body?.productId ?? req.body?.product_id);
  const quantity = Number(req.body?.quantity);
  const requestedType = String(req.body?.type ?? "IN").toUpperCase();
  const type = toDbType[requestedType];

  if (!Number.isInteger(productId) || productId <= 0 || !type) {
    res.status(400).json({ error: "Invalid stock movement payload" });
    return;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    res.status(400).json({ error: "Quantity must be greater than zero" });
    return;
  }

  const delta = requestedType === "OUT" ? -quantity : quantity;
  const movement = await db.transaction(async (tx: any) => {
    const [created] = await tx
      .insert(stockMovementsTable)
      .values({
        productId,
        type,
        quantity,
        reason: req.body?.reason ?? null,
        reference: req.body?.reference ?? null,
        userId: req.user?.id ?? null,
      })
      .returning();

    await tx.execute(
      sql`UPDATE products SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) + ${delta}, 0), updated_at = now() WHERE id = ${productId}`,
    );

    return created;
  });

  res.status(201).json({ ...movement, type: toApiType(movement.type) });
});

export default router;
