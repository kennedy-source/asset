// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { productionOrdersTable, customersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateProductionOrderBody,
  UpdateProductionOrderBody,
  ListProductionOrdersQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { nextSequence } from "../lib/sequences";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";
import {
  assertTransition,
  productionTransitions,
  type ProductionStatus,
} from "../lib/workflows";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res): Promise<void> => {
  const qp = ListProductionOrdersQueryParams.safeParse(req.query);
  const { status } = qp.success ? qp.data : {};
  const { page, limit } = parsePaginationQuery(
    req.query as Record<string, unknown>,
  );
  const pg = resolvePagination({ page, limit });

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(productionOrdersTable)
    .where(status ? eq(productionOrdersTable.status, status) : undefined);

  const rows = await db
    .select({
      id: productionOrdersTable.id,
      orderNumber: productionOrdersTable.orderNumber,
      customerId: productionOrdersTable.customerId,
      customerName: customersTable.name,
      type: productionOrdersTable.type,
      status: productionOrdersTable.status,
      priority: productionOrdersTable.priority,
      startDate: productionOrdersTable.startDate,
      dueDate: productionOrdersTable.dueDate,
      completedDate: productionOrdersTable.completedDate,
      notes: productionOrdersTable.notes,
      createdAt: productionOrdersTable.createdAt,
    })
    .from(productionOrdersTable)
    .leftJoin(
      customersTable,
      eq(productionOrdersTable.customerId, customersTable.id),
    )
    .where(status ? eq(productionOrdersTable.status, status) : undefined)
    .orderBy(productionOrdersTable.createdAt)
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
  const parsed = CreateProductionOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const orderNumber = await nextSequence("seq_production", "PRD");
  const [order] = await db
    .insert(productionOrdersTable)
    .values({
      ...parsed.data,
      orderNumber,
      status: "PENDING",
    })
    .returning();
  res.status(201).json({ ...order, customerName: null });
});

router.patch("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateProductionOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const current = await db
    .select()
    .from(productionOrdersTable)
    .where(eq(productionOrdersTable.id, id))
    .limit(1);
  if (!current[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updates: Partial<typeof productionOrdersTable.$inferInsert> = {};
  if (parsed.data.status != null) {
    assertTransition(
      "production order",
      current[0].status as ProductionStatus,
      parsed.data.status as ProductionStatus,
      productionTransitions,
    );
    updates.status = parsed.data.status;
  }
  if (parsed.data.priority != null) updates.priority = parsed.data.priority;
  if (parsed.data.completedDate != null)
    updates.completedDate = parsed.data.completedDate;
  if (parsed.data.notes != null) updates.notes = parsed.data.notes;
  const [updated] = await db
    .update(productionOrdersTable)
    .set(updates)
    .where(eq(productionOrdersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...updated, customerName: null });
});

export default router;
