import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpsertSettingBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable).orderBy(settingsTable.key);
  res.json(rows);
});

router.post("/", async (req, res): Promise<void> => {
  const parsed = UpsertSettingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, parsed.data.key))
    .limit(1);
  if (existing[0]) {
    const [updated] = await db
      .update(settingsTable)
      .set({ value: parsed.data.value })
      .where(eq(settingsTable.key, parsed.data.key))
      .returning();
    res.json(updated);
  } else {
    const [inserted] = await db
      .insert(settingsTable)
      .values(parsed.data)
      .returning();
    res.json(inserted);
  }
});

export default router;
