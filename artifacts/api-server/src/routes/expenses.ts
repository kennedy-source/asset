// @ts-nocheck
import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateExpenseBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function normalizeExpenseBody(body: any) {
  return {
    title: String(body?.title ?? "").trim(),
    description: body?.description ?? null,
    amount: Number(body?.amount ?? 0),
    category: String(body?.category ?? "General").trim() || "General",
    paymentMethod: body?.paymentMethod ?? body?.payment_method ?? null,
    reference: body?.reference ?? null,
    supplierId: body?.supplierId ?? body?.supplier_id ?? null,
    expenseDate: body?.expenseDate ?? body?.expense_date ?? new Date().toISOString(),
  };
}

router.get("/", async (req, res): Promise<void> => {
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
  const offset = (page - 1) * limit;
  const search = String(req.query.query ?? req.query.search ?? "").trim();

  const where = search
    ? sql`lower(title) LIKE ${`%${search.toLowerCase()}%`} OR lower(category) LIKE ${`%${search.toLowerCase()}%`}`
    : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(expensesTable)
    .where(where);

  const rows = await db
    .select({
      id: expensesTable.id,
      title: expensesTable.title,
      description: expensesTable.description,
      amount: expensesTable.amount,
      category: expensesTable.category,
      paymentMethod: expensesTable.paymentMethod,
      reference: expensesTable.reference,
      createdBy: expensesTable.createdBy,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .where(where)
    .orderBy(sql`${expensesTable.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  const data = rows.map((row: any) => ({
    ...row,
    payment_method: row.paymentMethod,
    expense_date: row.createdAt,
    created_by: row.createdBy,
    created_at: row.createdAt,
  }));

  res.json({ data, items: data, total: Number(total), page, limit });
});

router.post("/", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success && !req.body?.title) {
    res.status(400).json({ error: "Invalid expense payload" });
    return;
  }

  const expense = normalizeExpenseBody(req.body);
  if (!expense.title || !Number.isFinite(expense.amount) || expense.amount <= 0) {
    res.status(400).json({ error: "Title and positive amount are required" });
    return;
  }

  const [inserted] = await db
    .insert(expensesTable)
    .values({
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      reference: expense.reference,
      createdBy: req.user?.id ?? null,
    })
    .returning();
  res.status(201).json(inserted);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const expense = normalizeExpenseBody(req.body);
  const [updated] = await db
    .update(expensesTable)
    .set({
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      reference: expense.reference,
    })
    .where(eq(expensesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.json({ success: true });
});

export default router;
