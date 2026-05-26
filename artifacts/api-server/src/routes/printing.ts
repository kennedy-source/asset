// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { printingJobsTable, customersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreatePrintingJobBody,
  UpdatePrintingJobBody,
  ListPrintingJobsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { nextSequence } from "../lib/sequences";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";
import {
  assertTransition,
  printingTransitions,
  type PrintingStatus,
} from "../lib/workflows";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res): Promise<void> => {
  const qp = ListPrintingJobsQueryParams.safeParse(req.query);
  const { status } = qp.success ? qp.data : {};
  const { page, limit } = parsePaginationQuery(
    req.query as Record<string, unknown>,
  );
  const pg = resolvePagination({ page, limit });

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(printingJobsTable)
    .where(status ? eq(printingJobsTable.status, status) : undefined);

  const rows = await db
    .select({
      id: printingJobsTable.id,
      jobNumber: printingJobsTable.jobNumber,
      customerId: printingJobsTable.customerId,
      customerName: customersTable.name,
      designImageUrl: printingJobsTable.designImageUrl,
      printType: printingJobsTable.printType,
      garmentType: printingJobsTable.garmentType,
      position: printingJobsTable.position,
      colors: printingJobsTable.colors,
      quantity: printingJobsTable.quantity,
      pricePerItem: printingJobsTable.pricePerItem,
      total: printingJobsTable.total,
      status: printingJobsTable.status,
      assignedTo: printingJobsTable.assignedTo,
      dueDate: printingJobsTable.dueDate,
      notes: printingJobsTable.notes,
      createdAt: printingJobsTable.createdAt,
    })
    .from(printingJobsTable)
    .leftJoin(
      customersTable,
      eq(printingJobsTable.customerId, customersTable.id),
    )
    .where(status ? eq(printingJobsTable.status, status) : undefined)
    .orderBy(printingJobsTable.createdAt)
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
  const parsed = CreatePrintingJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const total = parsed.data.quantity * parsed.data.pricePerItem;
  const jobNumber = await nextSequence("seq_printing", "PRN");
  const [job] = await db
    .insert(printingJobsTable)
    .values({
      ...parsed.data,
      jobNumber,
      total,
      status: "PENDING",
    })
    .returning();
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
      id: printingJobsTable.id,
      jobNumber: printingJobsTable.jobNumber,
      customerId: printingJobsTable.customerId,
      customerName: customersTable.name,
      designImageUrl: printingJobsTable.designImageUrl,
      printType: printingJobsTable.printType,
      garmentType: printingJobsTable.garmentType,
      position: printingJobsTable.position,
      colors: printingJobsTable.colors,
      quantity: printingJobsTable.quantity,
      pricePerItem: printingJobsTable.pricePerItem,
      total: printingJobsTable.total,
      status: printingJobsTable.status,
      assignedTo: printingJobsTable.assignedTo,
      dueDate: printingJobsTable.dueDate,
      notes: printingJobsTable.notes,
      createdAt: printingJobsTable.createdAt,
    })
    .from(printingJobsTable)
    .leftJoin(
      customersTable,
      eq(printingJobsTable.customerId, customersTable.id),
    )
    .where(eq(printingJobsTable.id, id))
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
  const parsed = UpdatePrintingJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const current = await db
    .select()
    .from(printingJobsTable)
    .where(eq(printingJobsTable.id, id))
    .limit(1);
  if (!current[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updates: Partial<typeof printingJobsTable.$inferInsert> = {};
  if (parsed.data.status != null) {
    assertTransition(
      "printing job",
      current[0].status as PrintingStatus,
      parsed.data.status as PrintingStatus,
      printingTransitions,
    );
    updates.status = parsed.data.status;
  }
  if (parsed.data.assignedTo != null)
    updates.assignedTo = parsed.data.assignedTo;
  if (parsed.data.notes != null) updates.notes = parsed.data.notes;
  if (parsed.data.dueDate != null) updates.dueDate = parsed.data.dueDate;
  const [updated] = await db
    .update(printingJobsTable)
    .set(updates)
    .where(eq(printingJobsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...updated, customerName: null });
});

export default router;
