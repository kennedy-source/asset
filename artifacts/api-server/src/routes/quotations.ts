// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import {
  quotationsTable,
  quotationItemsTable,
  customersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateQuotationBody, UpdateQuotationBody } from "@workspace/api-zod";
import { requireAuth, hasRole } from "../middlewares/auth";
import { roles } from "../lib/rbac";
import { AppError } from "../lib/errors";
import {
  assertNonNegativeInteger,
  assertNonNegativeMoney,
} from "../lib/finance";
import { logAudit } from "../lib/audit";
import {
  assertTransition,
  quotationTransitions,
  type QuotationStatus,
} from "../lib/workflows";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";
import { convertQuotationToInvoice } from "../services/orchestration";
import { nextSequence } from "../lib/sequences";

const router = Router();
router.use(requireAuth);

function normalizeQuotationBody(body: any) {
  return {
    customerId: body?.customerId ?? body?.customer_id ?? null,
    discount: Number(body?.discount ?? body?.discount_amount ?? 0),
    tax: Number(body?.tax ?? body?.tax_amount ?? 0),
    validUntil: body?.validUntil ?? body?.valid_until ?? null,
    notes: body?.notes ?? null,
    items: Array.isArray(body?.items)
      ? body.items.map((item: any) => ({
          itemName: item?.itemName ?? item?.item_name ?? item?.description ?? "Item",
          description: item?.description ?? item?.itemName ?? item?.item_name ?? "Item",
          productId: item?.productId ?? item?.product_id ?? null,
          quantity: Number(item?.quantity ?? 0),
          unitPrice: Number(item?.unitPrice ?? item?.unit_price ?? 0),
        }))
      : [],
  };
}

router.get("/", async (req, res): Promise<void> => {
  const { page, limit } = parsePaginationQuery(
    req.query as Record<string, unknown>,
  );
  const pg = resolvePagination({ page, limit });

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(quotationsTable);
  const rows = await db
    .select({
      id: quotationsTable.id,
      quotationNumber: quotationsTable.quotationNumber,
      customerId: quotationsTable.customerId,
      customerName: customersTable.name,
      subtotal: quotationsTable.subtotal,
      discount: quotationsTable.discount,
      tax: quotationsTable.tax,
      total: quotationsTable.total,
      status: quotationsTable.status,
      validUntil: quotationsTable.validUntil,
      notes: quotationsTable.notes,
      createdAt: quotationsTable.createdAt,
    })
    .from(quotationsTable)
    .leftJoin(customersTable, eq(quotationsTable.customerId, customersTable.id))
    .orderBy(quotationsTable.createdAt)
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
  if (!hasRole(req.user?.role, ...roles.sales))
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  const parsed = CreateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid quotation payload", {
      details: parsed.error.flatten(),
      exposeDetails: true,
    });
  }

  const {
    items,
    customerId,
    discount = 0,
    tax = 0,
    validUntil,
    notes,
  } = normalizeQuotationBody(req.body);
  assertNonNegativeMoney(discount, "discount");
  assertNonNegativeMoney(tax, "tax");
  for (const item of items) {
    assertNonNegativeInteger(item.quantity, "item.quantity");
    assertNonNegativeMoney(item.unitPrice, "item.unitPrice");
  }
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  assertNonNegativeMoney(subtotal, "subtotal");
  const total = subtotal - discount + tax;
  assertNonNegativeMoney(total, "total");
  const qNumber = await nextSequence("seq_quotations", "QUO");
  const quotation = await db.transaction(async (tx: any) => {
    const [created] = await tx
      .insert(quotationsTable)
      .values({
        quotationNumber: qNumber,
        customerId: customerId ?? null,
        subtotal,
        discount,
        tax,
        total,
        status: "draft",
        validUntil: validUntil ?? null,
        notes: notes ?? null,
        createdBy: req.user?.id ?? null,
      })
      .returning();

    for (const item of items) {
      await tx.insert(quotationItemsTable).values({
        quotationId: created.id,
        itemName: item.itemName,
        description: item.description ?? null,
        productId: item.productId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      });
    }
    return created;
  });
  await logAudit(req, "CREATE_QUOTATION", "Quotation", quotation.id, null, {
    total,
    customerId,
  });
  res.status(201).json({ ...quotation, customerName: null });
});

router.get("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const rows = await db
    .select({
      id: quotationsTable.id,
      quotationNumber: quotationsTable.quotationNumber,
      customerId: quotationsTable.customerId,
      customerName: customersTable.name,
      subtotal: quotationsTable.subtotal,
      discount: quotationsTable.discount,
      tax: quotationsTable.tax,
      total: quotationsTable.total,
      status: quotationsTable.status,
      validUntil: quotationsTable.validUntil,
      notes: quotationsTable.notes,
      createdAt: quotationsTable.createdAt,
    })
    .from(quotationsTable)
    .leftJoin(customersTable, eq(quotationsTable.customerId, customersTable.id))
    .where(eq(quotationsTable.id, id))
    .limit(1);

  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const qItems = await db
    .select()
    .from(quotationItemsTable)
    .where(eq(quotationItemsTable.quotationId, id));
  res.json({ ...rows[0], items: qItems });
});

router.patch("/:id", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.sales))
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const current = await db
    .select()
    .from(quotationsTable)
    .where(eq(quotationsTable.id, id))
    .limit(1);
  if (!current[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updates: Partial<typeof quotationsTable.$inferInsert> = {};
  if (parsed.data.status != null) {
    updates.status = String(parsed.data.status).toLowerCase();
  }
  if (parsed.data.notes != null) updates.notes = parsed.data.notes;
  if (parsed.data.validUntil != null || parsed.data.valid_until != null)
    updates.validUntil = parsed.data.validUntil ?? parsed.data.valid_until;
  const updatedRows = await db.execute(sql`
    UPDATE quotations
    SET status = COALESCE(${updates.status ?? null}, status),
        notes = COALESCE(${updates.notes ?? null}, notes),
        valid_until = COALESCE(${updates.validUntil ?? null}, valid_until),
        updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `);
  const updated = updatedRows.rows?.[0] ?? updatedRows[0];
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (updates.status) {
    await logAudit(
      req,
      "QUOTATION_STATUS",
      "Quotation",
      id,
      { status: current[0].status },
      { status: updates.status },
    );
  }
  res.json({ ...updated, customerName: null });
});

router.post("/:id/convert", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.sales))
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const rows = await db
    .select()
    .from(quotationsTable)
    .where(eq(quotationsTable.id, id))
    .limit(1);
  const quotation = rows[0];
  if (!quotation) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const invoice = await convertQuotationToInvoice(id);
  await logAudit(
    req,
    "CONVERT_QUOTATION",
    "Quotation",
    id,
    { status: quotation.status },
    { invoiceId: invoice.id },
  );
  res.status(201).json({ ...invoice, customerName: null, quotationId: id });
});

export default router;
