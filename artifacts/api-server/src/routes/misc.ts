// @ts-nocheck
import { Router } from "express";
import { db, notificationsTable, settingsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { createHash } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "pajoy_salt_2024").digest("hex");
}

// Notifications
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(50);
    return res.json(notifications.map(n => ({
      id: n.id, title: n.title, message: n.message, type: n.type,
      read: n.read, link: n.link, created_at: n.createdAt,
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get notifications" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [notif] = await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, id)).returning();
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    return res.json({ id: notif.id, title: notif.title, message: notif.message, type: notif.type, read: notif.read, link: notif.link, created_at: notif.createdAt });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to mark notification" });
  }
});

router.post("/notifications/mark-all-read", async (req, res) => {
  try {
    await db.update(notificationsTable).set({ read: true });
    return res.json({ message: "All notifications marked as read" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to mark all notifications" });
  }
});

// Settings
router.get("/settings", async (req, res) => {
  try {
    const settings = await db.select().from(settingsTable).orderBy(settingsTable.category, settingsTable.key);
    return res.json(settings.map(s => ({
      id: s.id, key: s.key, value: s.value, category: s.category,
      description: s.description, updated_at: s.updatedAt,
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get settings" });
  }
});

router.post("/settings/bulk-update", async (req, res) => {
  try {
    const { settings } = req.body as { settings: Array<{ key: string; value: string }> };
    for (const s of settings) {
      const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, s.key)).limit(1);
      if (existing.length > 0) {
        await db.update(settingsTable).set({ value: s.value }).where(eq(settingsTable.key, s.key));
      } else {
        await db.insert(settingsTable).values({ key: s.key, value: s.value, category: "general" });
      }
    }
    return res.json({ message: "Settings updated" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

// Users
router.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.name);
    return res.json(users.map(u => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone,
      role: u.role, branch_id: u.branchId, is_active: u.isActive,
      avatar_url: u.avatarUrl, last_login: u.lastLogin, created_at: u.createdAt,
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.email || !body.password) return res.status(400).json({ error: "Name, email, and password required" });
    const passwordHash = hashPassword(body.password);
    const [user] = await db.insert(usersTable).values({
      name: body.name, email: body.email, phone: body.phone,
      passwordHash, role: body.role ?? "cashier",
      branchId: body.branch_id, isActive: true,
    }).returning();
    const { passwordHash: _, ...safe } = user;
    return res.status(201).json({ ...safe, phone: safe.phone, role: safe.role, branch_id: safe.branchId, is_active: safe.isActive, avatar_url: safe.avatarUrl, last_login: safe.lastLogin, created_at: safe.createdAt });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.role !== undefined) updates.role = body.role;
    if (body.is_active !== undefined) updates.isActive = body.is_active;
    if (body.branch_id !== undefined) updates.branchId = body.branch_id;
    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, branch_id: user.branchId, is_active: user.isActive,
      avatar_url: user.avatarUrl, last_login: user.lastLogin, created_at: user.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
