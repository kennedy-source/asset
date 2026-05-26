import { Router } from "express";
import { handlePaystackWebhook, verifyPaystackWebhookSignature } from "../services/paystack";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { pool } from "@workspace/db";

const router = Router();

router.post("/", async (req, res): Promise<void> => {
  const signature = String(req.headers["x-paystack-signature"] ?? "");
  const rawBody = (req as any).rawBody;

  if (!signature || !rawBody) {
    throw new AppError(401, "UNAUTHORIZED", "Missing Paystack webhook signature or payload");
  }

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    logger.warn({ path: req.path }, "Invalid Paystack webhook signature");
    throw new AppError(401, "UNAUTHORIZED", "Invalid Paystack webhook signature");
  }

  let payload: any;
  try {
    payload = typeof rawBody === "string" ? JSON.parse(rawBody) : JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    logger.warn({ err }, "Failed to parse Paystack webhook payload");
    throw new AppError(400, "VALIDATION_ERROR", "Invalid webhook payload");
  }

  logger.info({ event: payload?.event, reference: payload?.data?.reference }, "Received Paystack webhook");
  const eventId = String(payload?.data?.id ?? payload?.data?.reference ?? `${payload?.event}-${Date.now()}`);
  await pool.query(
    `INSERT INTO webhook_events (provider, event_id, event_type, reference, signature, payload)
     VALUES ('paystack', $1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [eventId, String(payload?.event ?? "unknown"), String(payload?.data?.reference ?? ""), signature, JSON.stringify(payload)],
  );
  const result = await handlePaystackWebhook(payload);
  await pool.query(
    `UPDATE webhook_events SET processed_at = now() WHERE provider = 'paystack' AND event_id = $1`,
    [eventId],
  );

  res.status(200).json({
    status: true,
    data: result,
  });
});

export default router;
