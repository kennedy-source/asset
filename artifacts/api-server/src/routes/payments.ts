// @ts-nocheck
import { Router } from "express";
import type { Request } from "express";

import { db, pool, paymentsTable, customersTable } from "@workspace/db";

import { eq, sql } from "drizzle-orm";

import { CreatePaymentBody } from "@workspace/api-zod";
import { requireAuth, hasRole } from "../middlewares/auth";
import { AppError } from "../lib/errors";
import { roles } from "../lib/rbac";
import { assertNonNegativeMoney } from "../lib/finance";
import { logAudit } from "../lib/audit";

import { parsePaginationQuery, resolvePagination } from "../lib/pagination";

import { postPayment } from "../services/payments";
import { initiatePaystackPayment, verifyPaystackTransaction } from "../services/paystack";

const router = Router();

/**
 * TEMPORARY STABILIZATION CAST
 * db currently resolves to:
 * PostgresDatabase | SQLiteDatabase
 *
 * During parity migration we stabilize runtime using `any`
 * until repository abstraction is fully completed.
 */
const pgDb: any = db;

// Pesapal callback endpoints removed

router.use(requireAuth);

router.get("/summary", async (req, res): Promise<void> => {
  const dateStr = String(req.query?.date ?? "").trim() || null;
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const dateOnly = `${targetDate.getFullYear()}-${String(
    targetDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

  // Aggregate payments by method for the given date
  const rows = await pgDb
    .select({
      cash: sql<number>`COALESCE(SUM(CASE WHEN upper(${paymentsTable.method}) = 'CASH' THEN ${paymentsTable.amount} ELSE 0 END), 0)`,
      bank: sql<number>`COALESCE(SUM(CASE WHEN upper(${paymentsTable.method}) IN ('BANK', 'BANK_TRANSFER') THEN ${paymentsTable.amount} ELSE 0 END), 0)`,
      total: sql<number>`COALESCE(SUM(${paymentsTable.amount}), 0)`,
    })
    .from(paymentsTable)
    .where(sql`DATE(${paymentsTable.createdAt}) = ${dateOnly}`);

  const out = rows[0] || { cash: 0, bank: 0, total: 0 };
  res.json({ cash: Number(out.cash), bank: Number(out.bank), total: Number(out.total) });
});

router.get("/", async (req, res): Promise<void> => {
  const { page, limit } = parsePaginationQuery(
    req.query as Record<string, unknown>,
  );

  const pg = resolvePagination({
    page,
    limit,
  });

  const [{ total }] = await pgDb
    .select({
      total: sql<number>`COUNT(*)`.as("total"),
    })
    .from(paymentsTable);

  const rows = await pgDb
    .select({
      id: paymentsTable.id,
      saleId: paymentsTable.saleId,
      invoiceId: paymentsTable.invoiceId,
      customerId: paymentsTable.customerId,

      customerName: customersTable.name,

      amount: paymentsTable.amount,
      method: paymentsTable.method,
      status: paymentsTable.status,
      reference: paymentsTable.reference,



      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .leftJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
    .orderBy(paymentsTable.createdAt)
    .limit(pg.limit)
    .offset(pg.offset);

  res.json({
    items: rows,
    page: pg.page,
    limit: pg.limit,
    total: Number(total),
  });
});

async function initializePaystackHandler(req: Request, res: any): Promise<void> {
  if (!hasRole(req.user?.role, ...roles.sales)) {
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  }

  const amount = Number(req.body?.amount);
  const saleId = req.body?.saleId ?? null;
  const invoiceId = req.body?.invoiceId ?? null;
  const customerId = req.body?.customerId ?? null;
  const email = req.body?.email ? String(req.body.email).trim() : null;
  const phone = req.body?.phone ? String(req.body.phone).trim() : null;
  const reference = req.body?.reference ? String(req.body.reference).trim() : undefined;
  const currency = req.body?.currency ? String(req.body.currency).trim().toUpperCase() : "NGN";

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Amount must be a positive number");
  }
  if (!saleId && !invoiceId) {
    throw new AppError(400, "VALIDATION_ERROR", "Payment initiation requires saleId or invoiceId");
  }

  const initiated = await initiatePaystackPayment({
    saleId,
    invoiceId,
    customerId,
    amount,
    email,
    phone,
    reference,
    currency,
  });

  res.status(201).json({ ...initiated, access_code: initiated.accessCode, authorization_url: initiated.authorizationUrl });
}

router.post("/initiate", initializePaystackHandler);
router.post("/initialize", initializePaystackHandler);

router.post("/verify/:reference", async (req, res): Promise<void> => {
  const data = await verifyPaystackTransaction(req.params.reference);
  res.json({ status: true, data });
});

router.post("/refund", async (req, res): Promise<void> => {
  const amount = Number(req.body?.amount ?? 0);
  const reference = String(req.body?.reference ?? req.body?.transaction_reference ?? "").trim();
  const reason = String(req.body?.reason ?? "Refund requested").trim();
  if (!reference || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Reference and positive amount are required");
  }
  const { rows } = await pool.query(
    `INSERT INTO refunds (transaction_reference, amount, reason, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [reference, amount, reason],
  );
  await pool.query(
    `INSERT INTO payment_logs (transaction_reference, event_type, message, payload)
     VALUES ($1, 'refund.requested', $2, $3::jsonb)`,
    [reference, reason, JSON.stringify(req.body ?? {})],
  );
  res.status(202).json({ status: "pending", data: rows[0] });
});

router.get("/history", async (req, res): Promise<void> => {
  const { page, limit } = parsePaginationQuery(req.query as Record<string, unknown>);
  const pg = resolvePagination({ page, limit });
  const { rows } = await pool.query(
    `SELECT id, sale_id, invoice_id, customer_id, amount, method, status, reference, created_at
     FROM payments
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [pg.limit, pg.offset],
  );
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM payments`);
  res.json({ items: rows, page: pg.page, limit: pg.limit, total: Number(count.rows[0]?.total ?? 0) });
});

router.get("/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid payment id");
  }
  const { rows } = await pool.query(`SELECT * FROM payments WHERE id = $1`, [id]);
  if (!rows[0]) {
    throw new AppError(404, "NOT_FOUND", "Payment not found");
  }
  res.json(rows[0]);
});

router.post("/", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.sales)) {
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  }

  const parsed = CreatePaymentBody.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid payment payload", {
      details: parsed.error.flatten(),
      exposeDetails: true,
    });
  }

  assertNonNegativeMoney(parsed.data.amount, "amount");

  const inserted = await postPayment(parsed.data);

  await logAudit(req, "PAYMENT_POSTED", "Payment", inserted.id, null, {
    amount: inserted.amount,
    method: inserted.method,
    invoiceId: inserted.invoiceId,
    saleId: inserted.saleId,
  });

  res.status(201).json({
    ...inserted,
    customerName: null,
  });
});

// Pesapal initiate endpoint removed

export default router;
