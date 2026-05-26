import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res): Promise<void> => {
  const qp = ListAuditLogsQueryParams.safeParse(req.query);
  const { entity, userId } = qp.success ? qp.data : {};
  const { page, limit } = parsePaginationQuery(
    req.query as Record<string, unknown>,
  );
  const pg = resolvePagination({ page, limit });

  const conditions = [];
  if (entity) conditions.push(eq(auditLogsTable.entity, entity));
  if (userId) conditions.push(eq(auditLogsTable.userId, userId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(auditLogsTable)
    .where(where);

  const rows = await db
    .select({
      id: auditLogsTable.id,
      userId: auditLogsTable.userId,
      userName: sql<string | null>`COALESCE(audit_logs.user_name, ${usersTable.name})`,
      action: auditLogsTable.action,
      entity: auditLogsTable.entity,
      entityId: auditLogsTable.entityId,
      oldValue: auditLogsTable.oldValue,
      newValue: auditLogsTable.newValue,
      ipAddress: auditLogsTable.ipAddress,
      createdAt: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(where)
    .orderBy(auditLogsTable.createdAt)
    .limit(pg.limit)
    .offset(pg.offset);

  res.json({
    items: rows,
    page: pg.page,
    limit: pg.limit,
    total: Number(total),
  });
});

export default router;
