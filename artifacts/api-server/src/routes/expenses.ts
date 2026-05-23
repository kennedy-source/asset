import { Router } from "express";
import { db, expensesTable, expenseCategoriesTable, suppliersTable } from "@workspace/db";
import { eq, desc, and, gte, lte, count, ilike } from "drizzle-orm";

const router = Router();

function toExpense(e: typeof expensesTable.$inferSelect, supplierName?: string) {
  return {
    id: e.id, title: e.title, description: e.description, amount: Number(e.amount),
    category: e.category, payment_method: e.paymentMethod, reference: e.reference,
    supplier_id: e.supplierId, supplier_name: supplierName ?? null,
    expense_date: e.expenseDate, created_by: e.createdBy, created_at: e.createdAt,
  };
}

router.get("/expenses", async (req, res) => {
  try {
    const { from, to, category, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = Math.min(parseInt(limit), 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (from) conditions.push(gte(expensesTable.expenseDate, new Date(from)));
    if (to) conditions.push(lte(expensesTable.expenseDate, new Date(to)));
    if (category) conditions.push(ilike(expensesTable.category, `%${category}%`));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [expenses, suppliers, [totalRow]] = await Promise.all([
      db.select().from(expensesTable).where(where).orderBy(desc(expensesTable.expenseDate)).limit(limitNum).offset(offset),
      db.select({ id: suppliersTable.id, name: suppliersTable.name }).from(suppliersTable),
      db.select({ total: count() }).from(expensesTable).where(where),
    ]);
    const suppMap = new Map(suppliers.map(s => [s.id, s.name]));

    return res.json({
      data: expenses.map(e => toExpense(e, e.supplierId ? suppMap.get(e.supplierId) : undefined)),
      total: Number(totalRow.total), page: pageNum, limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list expenses" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const body = req.body;
    if (!body.title || !body.amount || !body.category) return res.status(400).json({ error: "Title, amount, and category required" });
    const [expense] = await db.insert(expensesTable).values({
      title: body.title, description: body.description, amount: body.amount.toString(),
      category: body.category, paymentMethod: body.payment_method, reference: body.reference,
      supplierId: body.supplier_id,
      expenseDate: body.expense_date ? new Date(body.expense_date) : new Date(),
    }).returning();
    return res.status(201).json(toExpense(expense));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create expense" });
  }
});

router.get("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).limit(1);
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    return res.json(toExpense(expense));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get expense" });
  }
});

router.patch("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.amount !== undefined) updates.amount = body.amount.toString();
    if (body.category !== undefined) updates.category = body.category;
    if (body.expense_date !== undefined) updates.expenseDate = new Date(body.expense_date);
    const [expense] = await db.update(expensesTable).set(updates).where(eq(expensesTable.id, id)).returning();
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    return res.json(toExpense(expense));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update expense" });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete expense" });
  }
});

router.get("/expense-categories", async (req, res) => {
  try {
    const cats = await db.select().from(expenseCategoriesTable).orderBy(expenseCategoriesTable.name);
    return res.json(cats.map(c => ({
      id: c.id, name: c.name, description: c.description,
      budget_amount: c.budgetAmount ? Number(c.budgetAmount) : null,
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list expense categories" });
  }
});

export default router;
