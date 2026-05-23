import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "pajoy_salt_2024").digest("hex");
}

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    role: user.role, branch_id: user.branchId, is_active: user.isActive,
    avatar_url: user.avatarUrl, last_login: user.lastLogin, created_at: user.createdAt,
  };
}

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }
    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
    req.session = { userId: user.id } as any;
    res.cookie("session_uid", user.id.toString(), { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ user: sanitizeUser(user), token: `session_${user.id}` });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("session_uid");
  return res.json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res) => {
  try {
    const sessionUid = req.cookies?.session_uid;
    if (!sessionUid) return res.status(401).json({ error: "Not authenticated" });
    const userId = parseInt(sessionUid);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || !user.isActive) return res.status(401).json({ error: "Not authenticated" });
    return res.json(sanitizeUser(user));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
