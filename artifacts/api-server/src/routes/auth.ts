import { Router } from "express";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  LoginBody,
  RegisterBody,
  ChangePasswordBody,
} from "@workspace/api-zod";
import { requireAuth, signToken } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import { AppError } from "../lib/errors";

const router = Router();

function legacyHashPassword(password: string): string {
  return createHash("sha256").update(password + "pajoy_salt_2024").digest("hex");
}

function safeUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _p, ...rest } = u;
  return rest;
}

router.post("/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid login payload");
  }
  const { email, password } = parsed.data;
  await logAudit(req, "LOGIN_ATTEMPT", "User", undefined, null, {
    email: email.toLowerCase(),
  });
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  const user = users[0];
  if (!user || !user.isActive) {
    await logAudit(req, "LOGIN_FAILED", "User", undefined, null, {
      email: email.toLowerCase(),
    });
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }
  const valid =
    user.passwordHash === legacyHashPassword(password) ||
    (await bcrypt.compare(password, user.passwordHash));
  if (!valid) {
    await logAudit(req, "LOGIN_FAILED", "User", user.id, null, {
      email: email.toLowerCase(),
    });
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }
  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  await logAudit(req, "LOGIN_SUCCESS", "User", user.id);
  res.json({ token, user: safeUser(user) });
});

router.post("/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select({ cnt: count() }).from(usersTable);
  if (existing[0].cnt > 0) {
    res
      .status(400)
      .json({
        error:
          "Admin already registered. Use the admin panel to add more users.",
      });
    return;
  }
  const hash = await bcrypt.hash(parsed.data.password, 12);
  const inserted = await db
    .insert(usersTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone ?? null,
      passwordHash: hash,
      role: "super_admin",
      isActive: true,
    })
    .returning();
  const user = inserted[0];
  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  res.status(201).json({ token, user: safeUser(user) });
});

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id))
    .limit(1);
  if (!users[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(safeUser(users[0]));
});

router.post(
  "/change-password",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = ChangePasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id))
      .limit(1);
    const user = users[0];
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const valid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    const hash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db
      .update(usersTable)
      .set({ passwordHash: hash })
      .where(eq(usersTable.id, user.id));
    res.json({ success: true });
  },
);

export default router;
