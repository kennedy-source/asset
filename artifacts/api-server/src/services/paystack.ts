import crypto from "node:crypto";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { db, paymentsTable, pool, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { postPayment } from "./payments";
import { logger } from "../lib/logger";

interface InitiatePaystackPaymentInput {
  saleId?: number | null;
  invoiceId?: number | null;
  customerId?: number | null;
  amount: number;
  email?: string | null;
  phone?: string | null;
  reference?: string;
  currency?: string;
}

function normalizeReference(reference?: string): string {
  if (reference) {
    return reference.trim();
  }
  return `paystack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function serializePaystackData(payload: unknown) {
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export function verifyPaystackWebhookSignature(rawBody: Buffer | string, signature: string) {
  const secret = env.paystackWebhookSecret;
  if (!secret) {
    throw new AppError(500, "INTERNAL_ERROR", "Paystack webhook secret is not configured");
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), "utf8");
  const expectedSignature = crypto.createHmac("sha512", secret).update(bodyBuffer).digest("hex");
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export async function initiatePaystackPayment(input: InitiatePaystackPaymentInput) {
  const secret = env.paystackSecretKey;
  if (!secret) {
    throw new AppError(500, "INTERNAL_ERROR", "Paystack secret key is not configured");
  }

  const reference = normalizeReference(input.reference);
  const currency = (input.currency ?? "NGN").toUpperCase();
  if (!input.email || !/\S+@\S+\.\S+/.test(input.email)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "A valid customer email address is required for Paystack payment initialization.",
    );
  }
  const email = input.email;

  if (!input.amount || input.amount <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Amount must be greater than zero");
  }

  const url = new URL("transaction/initialize", env.paystackApiUrl).toString();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      email,
      currency,
      reference,
      callback_url: env.paystackCallbackUrl,
      metadata: {
        saleId: input.saleId,
        invoiceId: input.invoiceId,
        customerId: input.customerId,
        phone: input.phone,
      },
    }),
  });

  const payload: any = await response.json().catch((err) => {
    throw new AppError(502, "INTERNAL_ERROR", "Failed to parse Paystack response", { details: String(err) });
  });

  if (!response.ok || payload?.status !== true) {
    throw new AppError(
      502,
      "INTERNAL_ERROR",
      "Paystack payment initialization failed",
      {
        details: {
          status: payload?.status,
          message: payload?.message,
          data: payload?.data,
        },
        exposeDetails: true,
      },
    );
  }

  // Ensure we don't create duplicate transaction records for the same reference
  const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.reference, reference)).limit(1);
  if (existing) {
    logger.info({ reference, status: existing.status }, "Paystack initiate: transaction already exists; returning existing record");
    return {
      authorizationUrl: existing.paystack_authorization_url ?? payload.data.authorization_url,
      reference,
      accessCode: existing.paystack_access_code ?? payload.data.access_code ?? null,
      amount: existing.amount ?? input.amount,
      currency: existing.currency ?? currency,
    };
  }

  if (!pool) {
    throw new AppError(500, "INTERNAL_ERROR", "Database pool unavailable");
  }

  try {
    await pool.query("SET LOCAL statement_timeout = 15000");
    await pool.query(
      "INSERT INTO transactions (sale_id, invoice_id, customer_id, amount, currency, method, status, reference, paystack_access_code, paystack_authorization_url, paystack_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (reference) DO NOTHING",
      [
        input.saleId ?? null,
        input.invoiceId ?? null,
        input.customerId ?? null,
        input.amount,
        currency,
        "PAYSTACK",
        "PENDING",
        reference,
        payload?.data?.access_code ?? null,
        payload?.data?.authorization_url ?? null,
        serializePaystackData(payload),
      ],
    );
  } catch (err) {
    logger.warn({ err, reference }, "Failed to insert initial transaction record; it may already exist");
  }

  return {
    authorizationUrl: payload.data.authorization_url,
    reference,
    accessCode: payload.data.access_code ?? null,
    amount: input.amount,
    currency,
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const secret = env.paystackSecretKey;
  if (!secret) {
    throw new AppError(500, "INTERNAL_ERROR", "Paystack secret key is not configured");
  }
  const normalizedReference = String(reference ?? "").trim();
  if (!normalizedReference) {
    throw new AppError(400, "VALIDATION_ERROR", "Payment reference is required");
  }

  const response = await fetch(new URL(`transaction/verify/${encodeURIComponent(normalizedReference)}`, env.paystackApiUrl), {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const payload: any = await response.json().catch((err) => {
    throw new AppError(502, "INTERNAL_ERROR", "Failed to parse Paystack verification response", { details: String(err) });
  });

  if (!response.ok || payload?.status !== true) {
    throw new AppError(502, "INTERNAL_ERROR", "Paystack verification failed", {
      details: { message: payload?.message, data: payload?.data },
      exposeDetails: true,
    });
  }

  await handlePaystackWebhook({ event: "charge.success", data: payload.data });
  return payload.data;
}

export async function handlePaystackWebhook(body: any) {
  const event = String(body?.event ?? "");
  const data = body?.data;
  const reference = String(data?.reference ?? "").trim();

  if (!reference) {
    throw new AppError(400, "VALIDATION_ERROR", "Paystack webhook payload missing reference");
  }

  const normalizedStatus = String(data?.status ?? "").toUpperCase();
  const amount = Number(data?.amount ?? 0) / 100;
  const currency = String(data?.currency ?? "NGN").toUpperCase();

  // Use a DB client transaction + SELECT FOR UPDATE to avoid race conditions
  if (!pool) {
    throw new AppError(500, "INTERNAL_ERROR", "Database pool unavailable");
  }
  const client = await pool.connect();
  let txRow: any = null;
  try {
    await client.query("SET LOCAL statement_timeout = 15000");
    await client.query("BEGIN");
    const sel = await client.query("SELECT * FROM transactions WHERE reference = $1 FOR UPDATE", [reference]);
    if (sel.rowCount === 0) {
      // Insert a minimal transaction record based on webhook payload
      try {
        await client.query(
          "INSERT INTO transactions (reference, amount, currency, method, status, paystack_data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (reference) DO NOTHING",
          [reference, amount, currency, "PAYSTACK", normalizedStatus === "SUCCESS" ? "COMPLETED" : "PENDING", serializePaystackData(data)],
        );
      } catch (err: any) {
        // If unique violation occurred or other error, log and re-select
        logger.warn({ err, reference }, "Transaction insert attempted; handling");
      }
      const re = await client.query("SELECT * FROM transactions WHERE reference = $1 FOR UPDATE", [reference]);
      if (re.rowCount === 0) {
        await client.query("ROLLBACK");
        throw new AppError(500, "INTERNAL_ERROR", "Paystack transaction record was not created and could not be loaded");
      }
      txRow = re.rows[0];
    } else {
      txRow = sel.rows[0];
    }

    // Already completed?
    if (String(txRow.status).toUpperCase() === "COMPLETED") {
      await client.query("COMMIT");
      logger.info({ reference }, "Webhook received for already-completed transaction");
      return { status: "ALREADY_PROCESSED" };
    }

    // If it's already PROCESSING, only allow retry if it's stuck (>10 minutes)
    if (String(txRow.status).toUpperCase() === "PROCESSING") {
      const updatedAt = txRow.updated_at ?? txRow.updatedAt ?? null;
      if (updatedAt) {
        const ageMs = Date.now() - new Date(updatedAt).getTime();
        if (ageMs < 10 * 60 * 1000) {
          await client.query("COMMIT");
          logger.info({ reference }, "Webhook received while transaction is PROCESSING and not stale");
          return { status: "ALREADY_PROCESSING" };
        }
        logger.warn({ reference, ageMs }, "Processing record stale, will allow retry");
      }
    }

    // Amount validation against stored transaction amount
    if (Number(txRow.amount) !== amount) {
      await client.query(
        "UPDATE transactions SET status = $1, paystack_data = $2 WHERE reference = $3",
        ["FAILED", serializePaystackData(data), reference],
      );
      await client.query("COMMIT");
      logger.warn({ reference, expected: txRow.amount, payloadAmount: amount }, "Paystack webhook amount mismatch");
      return { status: "FAILED_MISMATCH" };
    }

    if (normalizedStatus !== "SUCCESS") {
      await client.query(
        "UPDATE transactions SET status = $1, paystack_data = $2 WHERE reference = $3",
        ["FAILED", serializePaystackData(data), reference],
      );
      await client.query("COMMIT");
      logger.info({ reference, status: normalizedStatus }, "Paystack webhook indicates non-successful payment");
      return { status: "FAILED" };
    }

    // Claim processing to prevent duplicate workers and update timestamp
    await client.query("UPDATE transactions SET status = $1, updated_at = NOW() WHERE reference = $2", ["PROCESSING", reference]);
    await client.query("COMMIT");
  } finally {
    client.release();
  }

  // Now perform payment creation (business logic uses transactions internally)
  let payment: any = null;
  try {
    logger.info({ reference }, "Processing successful Paystack webhook: creating payment record");
    payment = await postPayment({
      saleId: txRow.sale_id ?? null,
      invoiceId: txRow.invoice_id ?? null,
      customerId: txRow.customer_id ?? null,
      amount,
      method: "PAYSTACK",
      reference,
    });
  } catch (err) {
    logger.error({ err, reference }, "Failed to create payment from Paystack webhook");
    // Mark transaction as failed so retries can attempt again
    try {
      await pool.query("UPDATE transactions SET status = $1, paystack_data = $2 WHERE reference = $3", ["FAILED", serializePaystackData(data), reference]);
    } catch (err2) {
      logger.warn({ err2, reference }, "Failed to mark transaction as FAILED after payment error");
    }
    throw err;
  }

  try {
    await pool.query("UPDATE transactions SET status = $1, paystack_data = $2 WHERE reference = $3", ["COMPLETED", serializePaystackData(data), reference]);
  } catch (err) {
    logger.warn({ err, reference }, "Failed to mark transaction as COMPLETED after payment creation");
  }

  logger.info({ reference, paymentId: payment.id }, "Paystack webhook processed and payment created");
  return { status: "COMPLETED", paymentId: payment.id };
}
