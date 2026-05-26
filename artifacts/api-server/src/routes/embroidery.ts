// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { embroideryJobsTable, customersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateEmbroideryJobBody,
  UpdateEmbroideryJobBody,
  ListEmbroideryJobsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { nextSequence } from "../lib/sequences";
import { logAudit } from "../lib/audit";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";
import {
  assertTransition,
  embroideryTransitions,
  type EmbroideryStatus,
} from "../lib/workflows";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res): Promise<void> => {
  const qp = ListEmbroideryJobsQueryParams.safeParse(req.query);
  const { status } = qp.success ? qp.data : {};
  const { page, limit } = parsePaginationQuery(
    req.query as Record<string, unknown>,
  );
  const pg = resolvePagination({ page, limit });

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(embroideryJobsTable)
    .where(status ? eq(embroideryJobsTable.status, status) : undefined);

  const rows = await db
    .select({
      id: embroideryJobsTable.id,
      jobNumber: embroideryJobsTable.jobNumber,
      customerId: embroideryJobsTable.customerId,
      customerName: customersTable.name,
      logoImageUrl: embroideryJobsTable.logoImageUrl,
      garmentType: embroideryJobsTable.garmentType,
      logoPosition: embroideryJobsTable.logoPosition,
      threadColors: embroideryJobsTable.threadColors,
      stitchCount: embroideryJobsTable.stitchCount,
      quantity: embroideryJobsTable.quantity,
      pricePerItem: embroideryJobsTable.pricePerItem,
      total: embroideryJobsTable.total,
      status: embroideryJobsTable.status,
      assignedTo: embroideryJobsTable.assignedTo,
      dueDate: embroideryJobsTable.dueDate,
      notes: embroideryJobsTable.notes,
      createdAt: embroideryJobsTable.createdAt,
    })
    .from(embroideryJobsTable)
    .leftJoin(
      customersTable,
      eq(embroideryJobsTable.customerId, customersTable.id),
    )
    .where(status ? eq(embroideryJobsTable.status, status) : undefined)
    .orderBy(embroideryJobsTable.createdAt)
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
  const parsed = CreateEmbroideryJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const total = parsed.data.quantity * parsed.data.pricePerItem;
  const jobNumber = await nextSequence("seq_embroidery", "EMB");

  const [job] = await db
    .insert(embroideryJobsTable)
    .values({
      ...parsed.data,
      jobNumber,
      total,
      status: "PENDING",
    })
    .returning();

  await logAudit(req, "CREATE", "EmbroideryJob", job.id);
  res.status(201).json({ ...job, customerName: null });
});

router.get("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db
    .select({
      id: embroideryJobsTable.id,
      jobNumber: embroideryJobsTable.jobNumber,
      customerId: embroideryJobsTable.customerId,
      customerName: customersTable.name,
      logoImageUrl: embroideryJobsTable.logoImageUrl,
      garmentType: embroideryJobsTable.garmentType,
      logoPosition: embroideryJobsTable.logoPosition,
      threadColors: embroideryJobsTable.threadColors,
      stitchCount: embroideryJobsTable.stitchCount,
      quantity: embroideryJobsTable.quantity,
      pricePerItem: embroideryJobsTable.pricePerItem,
      total: embroideryJobsTable.total,
      status: embroideryJobsTable.status,
      assignedTo: embroideryJobsTable.assignedTo,
      dueDate: embroideryJobsTable.dueDate,
      notes: embroideryJobsTable.notes,
      createdAt: embroideryJobsTable.createdAt,
    })
    .from(embroideryJobsTable)
    .leftJoin(
      customersTable,
      eq(embroideryJobsTable.customerId, customersTable.id),
    )
    .where(eq(embroideryJobsTable.id, id))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(rows[0]);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateEmbroideryJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const current = await db
    .select()
    .from(embroideryJobsTable)
    .where(eq(embroideryJobsTable.id, id))
    .limit(1);
  if (!current[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updates: Partial<typeof embroideryJobsTable.$inferInsert> = {};
  if (parsed.data.status != null) {
    assertTransition(
      "embroidery job",
      current[0].status as EmbroideryStatus,
      parsed.data.status as EmbroideryStatus,
      embroideryTransitions,
    );
    updates.status = parsed.data.status;
  }
  if (parsed.data.assignedTo != null)
    updates.assignedTo = parsed.data.assignedTo;
  if (parsed.data.notes != null) updates.notes = parsed.data.notes;
  if (parsed.data.logoImageUrl != null)
    updates.logoImageUrl = parsed.data.logoImageUrl;
  if (parsed.data.dueDate != null) updates.dueDate = parsed.data.dueDate;
  const [updated] = await db
    .update(embroideryJobsTable)
    .set(updates)
    .where(eq(embroideryJobsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logAudit(req, "UPDATE", "EmbroideryJob", id, current[0], updates);
  res.json({ ...updated, customerName: null });
});

export default router;
