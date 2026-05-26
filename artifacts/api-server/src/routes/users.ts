// @ts-nocheck
import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _p, ...rest } = u;
  return rest;
}

router.use(requireAuth);

router.get("/", async (req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);
  res.json(users.map(safeUser));
});

router.post("/", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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
      role: parsed.data.role,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();
  await logAudit(req, "CREATE", "User", inserted[0].id, null, {
    name: inserted[0].name,
  });
  res.status(201).json(safeUser(inserted[0]));
});

router.get("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (!users[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(safeUser(users[0]));
});

router.patch("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.email != null)
    updates.email = parsed.data.email.toLowerCase();
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.role != null) updates.role = parsed.data.role;
  if (parsed.data.isActive != null) updates.isActive = parsed.data.isActive;
  const updated = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logAudit(req, "UPDATE", "User", id, null, updates);
  res.json(safeUser(updated[0]));
});

router.delete("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAudit(req, "DELETE", "User", id);
  res.json({ success: true });
});

export default router;
