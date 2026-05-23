import { Router } from "express";
import { db, suppliersTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

const router = Router();

function toSupplier(s: typeof suppliersTable.$inferSelect) {
  return {
    id: s.id, name: s.name, contact_person: s.contactPerson,
    email: s.email, phone: s.phone, address: s.address, city: s.city,
    payment_terms: s.paymentTerms,
    credit_limit: s.creditLimit ? Number(s.creditLimit) : null,
    balance: s.balance ? Number(s.balance) : null,
    notes: s.notes, is_active: s.isActive, created_at: s.createdAt,
  };
}

router.get("/suppliers", async (req, res) => {
  try {
    const { q } = req.query as { q?: string };
    const where = q ? ilike(suppliersTable.name, `%${q}%`) : undefined;
    const suppliers = await db.select().from(suppliersTable).where(where).orderBy(suppliersTable.name);
    return res.json(suppliers.map(toSupplier));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list suppliers" });
  }
});

router.post("/suppliers", async (req, res) => {
  try {
    const body = req.body;
    if (!body.name) return res.status(400).json({ error: "Name required" });
    const [supplier] = await db.insert(suppliersTable).values({
      name: body.name, contactPerson: body.contact_person, email: body.email,
      phone: body.phone, address: body.address, city: body.city,
      paymentTerms: body.payment_terms, creditLimit: body.credit_limit?.toString(),
      notes: body.notes, isActive: true,
    }).returning();
    return res.status(201).json(toSupplier(supplier));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create supplier" });
  }
});

router.get("/suppliers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id)).limit(1);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    return res.json(toSupplier(supplier));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get supplier" });
  }
});

router.patch("/suppliers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.contact_person !== undefined) updates.contactPerson = body.contact_person;
    if (body.email !== undefined) updates.email = body.email;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.address !== undefined) updates.address = body.address;
    if (body.payment_terms !== undefined) updates.paymentTerms = body.payment_terms;
    if (body.credit_limit !== undefined) updates.creditLimit = body.credit_limit?.toString();
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.is_active !== undefined) updates.isActive = body.is_active;
    const [supplier] = await db.update(suppliersTable).set(updates).where(eq(suppliersTable.id, id)).returning();
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    return res.json(toSupplier(supplier));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update supplier" });
  }
});

export default router;
