// @ts-nocheck
import { Router } from "express";
import { db, syncQueueTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../lib/errors";
import {
  enqueueMutation,
  processPendingMutations,
  retryFailedMutations,
} from "../services/sync/processor";
import { hasRole } from "../middlewares/auth";
import { roles } from "../lib/rbac";
import { getSyncDaemonStatus } from "../services/sync/daemon";

const router = Router();
router.use(requireAuth);

router.get("/status", async (_req, res): Promise<void> => {
  const [pending] = (await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(syncQueueTable)
    .where(sql`${syncQueueTable.status} IN ('PENDING','PROCESSING')`)) as any[];
  const [failed] = (await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(syncQueueTable)
    .where(sql`${syncQueueTable.status} = 'FAILED'`)) as any[];

  res.json({
    pending: Number(pending.count),
    failed: Number(failed.count),
    worker: getSyncDaemonStatus(),
    conflictResolution: "placeholder",
    cloudSync: "not-configured",
  });
});

router.get("/worker", async (_req, res): Promise<void> => {
  res.json(getSyncDaemonStatus());
});

router.post("/enqueue", async (req, res): Promise<void> => {
  const entity = String(req.body?.entity ?? "").trim();
  const entityId = String(req.body?.entityId ?? "").trim();
  const operation = String(req.body?.operation ?? "").trim();
  if (!entity || !entityId || !operation) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "entity, entityId and operation are required",
    );
  }
  const created = await enqueueMutation({
    entity,
    entityId,
    operation,
    payload: req.body?.payload ?? {},
  });
  res.status(201).json(created);
});

router.post("/process", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.management))
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  const limit = Number(req.body?.limit ?? 25);
  const result = await processPendingMutations(
    Number.isFinite(limit) ? limit : 25,
  );
  res.json(result);
});

router.post("/retry-failed", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.management))
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  const limit = Number(req.body?.limit ?? 25);
  const result = await retryFailedMutations(
    Number.isFinite(limit) ? limit : 25,
  );
  res.json(result);
});

export default router;
