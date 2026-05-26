import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { Request } from "express";
import { env } from "../config/env";

interface AuditLogAuthUser {
  id: number;
  email: string;
  role: string;
  name: string;
}

function resolveRequestUser(req: Request): AuditLogAuthUser | undefined {
  if (req.user) return req.user as AuditLogAuthUser;
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, env.jwtSecret) as AuditLogAuthUser;
  } catch {
    return undefined;
  }
}

export async function logAudit(
  req: Request,
  action: string,
  entity: string,
  entityId?: string | number,
  oldValue?: unknown,
  newValue?: unknown,
) {
  try {
    const user = resolveRequestUser(req);
    await db.insert(auditLogsTable).values({
      userId: user?.id ?? null,
      userName: user?.name ?? null,
      action,
      entity,
      entityId: entityId != null ? String(entityId) : null,
      oldValue: oldValue != null ? JSON.stringify(oldValue) : null,
      newValue: newValue != null ? JSON.stringify(newValue) : null,
      ipAddress: req.ip ?? null,
    });
  } catch {
    // non-blocking
  }
}
