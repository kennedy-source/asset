// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoicesTable,
  invoiceItemsTable,
  customersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateInvoiceBody, UpdateInvoiceBody } from "@workspace/api-zod";
import { requireAuth, hasRole } from "../middlewares/auth";
import { nextSequence } from "../lib/sequences";
import { roles } from "../lib/rbac";
import { AppError } from "../lib/errors";
import {
  assertNonNegativeInteger,
  assertNonNegativeMoney,
  computeBalance,
} from "../lib/finance";
import { logAudit } from "../lib/audit";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";
import {
  assertTransition,
  invoiceTransitions,
  type InvoiceStatus,
} from "../lib/workflows";

const router = Router();
router.use(requireAuth);

function normalizeInvoiceBody(body: any) {
  return {
    customerId: body?.customerId ?? body?.customer_id ?? null,
    quotationId: body?.quotationId ?? body?.quotation_id ?? null,
    discount: Number(body?.discount ?? body?.discount_amount ?? 0),
    tax: Number(body?.tax ?? body?.tax_amount ?? 0),
    dueDate: body?.dueDate ?? body?.due_date ?? null,
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
    .from(invoicesTable);
  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
      quotationId: invoicesTable.quotationId,
      subtotal: invoicesTable.subtotal,
      discount: invoicesTable.discount,
      tax: invoicesTable.tax,
      total: invoicesTable.total,
      amountPaid: invoicesTable.amountPaid,
      balance: invoicesTable.balance,
      status: invoicesTable.status,
      dueDate: invoicesTable.dueDate,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .orderBy(invoicesTable.createdAt)
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
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid invoice payload", {
      details: parsed.error.flatten(),
      exposeDetails: true,
    });
  }

  const {
    items,
    customerId,
    quotationId,
    discount = 0,
    tax = 0,
    dueDate,
  } = normalizeInvoiceBody(req.body);
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
  const invNumber = await nextSequence("seq_invoices", "INV");
  const invoice = await db.transaction(async (tx: any) => {
    const [created] = await tx
      .insert(invoicesTable)
      .values({
        invoiceNumber: invNumber,
        customerId: customerId ?? null,
        quotationId: quotationId ?? null,
        subtotal,
        discount,
        tax,
        total,
        amountPaid: 0,
        balance: total,
        status: "unpaid",
        dueDate: dueDate ?? null,
      })
      .returning();
    for (const item of items) {
      await tx.insert(invoiceItemsTable).values({
        invoiceId: created.id,
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
  await logAudit(req, "CREATE_INVOICE", "Invoice", invoice.id, null, {
    total,
    customerId,
  });
  res.status(201).json({ ...invoice, customerName: null });
});

router.get("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
      quotationId: invoicesTable.quotationId,
      subtotal: invoicesTable.subtotal,
      discount: invoicesTable.discount,
      tax: invoicesTable.tax,
      total: invoicesTable.total,
      amountPaid: invoicesTable.amountPaid,
      balance: invoicesTable.balance,
      status: invoicesTable.status,
      dueDate: invoicesTable.dueDate,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .where(eq(invoicesTable.id, id))
    .limit(1);

  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const invItems = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, id));
  res.json({ ...rows[0], items: invItems });
});

router.patch("/:id", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.sales))
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const current = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id))
    .limit(1);
  if (!current[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const nextDueDate = parsed.data.dueDate ?? parsed.data.due_date ?? current[0].dueDate ?? null;
  const nextAmountPaid =
    parsed.data.amountPaid != null
      ? Number(parsed.data.amountPaid)
      : parsed.data.amount_paid != null
        ? Number(parsed.data.amount_paid)
        : Number(current[0].amountPaid ?? 0);
  assertNonNegativeMoney(nextAmountPaid, "amountPaid");
  const nextBalance = computeBalance(Number(current[0].total), nextAmountPaid, true);
  const requestedStatus = parsed.data.status != null ? String(parsed.data.status).toLowerCase() : null;
  const nextStatus = requestedStatus ?? (nextBalance === 0 ? "paid" : nextAmountPaid > 0 ? "partial" : "unpaid");

  const updatedRows = await db.execute(sql`
    UPDATE invoices
    SET due_date = ${nextDueDate},
        amount_paid = ${nextAmountPaid},
        balance = ${nextBalance},
        status = ${nextStatus},
        updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `);
  const updated = updatedRows.rows?.[0] ?? updatedRows[0];
  const updates = { dueDate: nextDueDate, amountPaid: nextAmountPaid, balance: nextBalance, status: nextStatus };
  await logAudit(req, "UPDATE_INVOICE", "Invoice", id, current[0], updates);
  res.json({ ...updated, customerName: null });
});

router.patch("/:id/payment-status", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.sales))
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const status = String(req.body?.status || "").trim().toLowerCase();
  const amountPaid = req.body?.amountPaid != null ? Number(req.body.amountPaid) : undefined;
  if (!["unpaid", "partial", "paid"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const current = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id))
    .limit(1);
  if (!current[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const nextAmountPaid = amountPaid != null ? amountPaid : Number(current[0].amountPaid ?? 0);
  assertNonNegativeMoney(nextAmountPaid, "amountPaid");
  const nextBalance = status === "paid" ? 0 : computeBalance(Number(current[0].total), nextAmountPaid, true);
  const updatedRows = await db.execute(sql`
    UPDATE invoices
    SET status = ${status},
        amount_paid = ${nextAmountPaid},
        balance = ${nextBalance},
        updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `);
  const updated2 = updatedRows.rows?.[0] ?? updatedRows[0];
  const updates = { status, amountPaid: nextAmountPaid, balance: nextBalance };
  await logAudit(req, "UPDATE_INVOICE_PAYMENT_STATUS", "Invoice", id, current[0], updates);
  res.json({ ...updated2, customerName: null });
});

export default router;
