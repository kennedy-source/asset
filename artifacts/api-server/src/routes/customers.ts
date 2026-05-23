import { Router } from "express";
import { db, customersTable, salesTable, saleItemsTable } from "@workspace/db";
import { eq, ilike, or, count, sql, desc } from "drizzle-orm";

const router = Router();

function toCustomer(c: typeof customersTable.$inferSelect, extra?: { total_purchases?: number; purchase_count?: number }) {
  return {
    id: c.id, name: c.name, email: c.email, phone: c.phone,
    alt_phone: c.altPhone, address: c.address, city: c.city,
    id_number: c.idNumber, customer_type: c.customerType,
    credit_limit: c.creditLimit ? Number(c.creditLimit) : null,
    balance: Number(c.balance), loyalty_points: c.loyaltyPoints,
    notes: c.notes, is_active: c.isActive, created_at: c.createdAt,
    total_purchases: extra?.total_purchases ?? null,
    purchase_count: extra?.purchase_count ?? null,
  };
}

router.get("/customers", async (req, res) => {
  try {
    const { q, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = Math.min(parseInt(limit), 200);
    const offset = (pageNum - 1) * limitNum;

    const where = q ? or(ilike(customersTable.name, `%${q}%`), ilike(customersTable.phone, `%${q}%`)) : undefined;

    const [customers, [totalRow]] = await Promise.all([
      db.select().from(customersTable).where(where).limit(limitNum).offset(offset).orderBy(customersTable.name),
      db.select({ total: count() }).from(customersTable).where(where),
    ]);

    return res.json({
      data: customers.map(c => toCustomer(c)),
      total: Number(totalRow.total), page: pageNum, limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list customers" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.phone) return res.status(400).json({ error: "Name and phone required" });
    const [customer] = await db.insert(customersTable).values({
      name: body.name, email: body.email, phone: body.phone,
      altPhone: body.alt_phone, address: body.address, city: body.city,
      idNumber: body.id_number, customerType: body.customer_type ?? "retail",
      creditLimit: body.credit_limit?.toString(),
      notes: body.notes, isActive: true,
    }).returning();
    return res.status(201).json(toCustomer(customer));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id)).limit(1);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const [salesAgg] = await db.select({
      total: sql<number>`COALESCE(SUM(${salesTable.total}), 0)`,
      cnt: count(),
    }).from(salesTable).where(eq(salesTable.customerId, id));

    return res.json(toCustomer(customer, {
      total_purchases: Number(salesAgg.total),
      purchase_count: Number(salesAgg.cnt),
    }));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get customer" });
  }
});

router.patch("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.alt_phone !== undefined) updates.altPhone = body.alt_phone;
    if (body.address !== undefined) updates.address = body.address;
    if (body.city !== undefined) updates.city = body.city;
    if (body.customer_type !== undefined) updates.customerType = body.customer_type;
    if (body.credit_limit !== undefined) updates.creditLimit = body.credit_limit?.toString();
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.is_active !== undefined) updates.isActive = body.is_active;
    const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    return res.json(toCustomer(customer));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update customer" });
  }
});

router.get("/customers/:id/purchases", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sales = await db.select().from(salesTable)
      .where(eq(salesTable.customerId, id))
      .orderBy(desc(salesTable.createdAt))
      .limit(50);
    return res.json(sales.map(s => ({
      id: s.id, sale_number: s.saleNumber, subtotal: Number(s.subtotal),
      discount_amount: Number(s.discountAmount), tax_amount: Number(s.taxAmount),
      total: Number(s.total), amount_paid: Number(s.amountPaid),
      change_given: Number(s.changeGiven), payment_method: s.paymentMethod,
      payment_status: s.paymentStatus, voided: s.voided, created_at: s.createdAt,
      items: [],
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get purchases" });
  }
});

export default router;
