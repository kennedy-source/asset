// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { aiScansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateAiScanBody, UpdateAiScanBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { runOcr } from "../services/ocr";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(aiScansTable)
    .orderBy(aiScansTable.createdAt);
  res.json(rows);
});

router.post("/", async (req, res): Promise<void> => {
  const parsed = CreateAiScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ocr = await runOcr(parsed.data.imageUrl);

  const [inserted] = await db
    .insert(aiScansTable)
    .values({
      imageUrl: parsed.data.imageUrl,
      extractedText: ocr.extractedText,
      parsedItemsJson: JSON.stringify(ocr.items),
      detectedTotal: ocr.detectedTotal,
      confidence: ocr.confidence,
      status: "PENDING",
      createdBy: req.user?.id ?? null,
    })
    .returning();

  res.status(201).json(inserted);
});

router.get("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db
    .select()
    .from(aiScansTable)
    .where(eq(aiScansTable.id, id))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(rows[0]);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateAiScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof aiScansTable.$inferInsert> = {};
  if (parsed.data.status != null) updates.status = parsed.data.status;
  if (parsed.data.parsedItemsJson != null)
    updates.parsedItemsJson = parsed.data.parsedItemsJson;
  const [updated] = await db
    .update(aiScansTable)
    .set(updates)
    .where(eq(aiScansTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

export default router;
