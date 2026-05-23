import { Router } from "express";
import { db, invoicesTable, invoiceItemsTable, invoicePaymentsTable, quotationsTable, quotationItemsTable, customersTable } from "@workspace/db";
import { eq, desc, and, count, sql } from "drizzle-orm";

const router = Router();

async function getNextInvoiceNumber() {
  const [last] = await db.select({ n: invoicesTable.invoiceNumber }).from(invoicesTable).orderBy(desc(invoicesTable.id)).limit(1);
  const num = last ? parseInt(last.n.split("-")[1] || "0") + 1 : 1;
  return `INV-${num.toString().padStart(4, "0")}`;
}

async function getNextQuotationNumber() {
  const [last] = await db.select({ n: quotationsTable.quotationNumber }).from(quotationsTable).orderBy(desc(quotationsTable.id)).limit(1);
  const num = last ? parseInt(last.n.split("-")[1] || "0") + 1 : 1;
  return `QUO-${num.toString().padStart(4, "0")}`;
}

async function buildInvoice(invoice: typeof invoicesTable.$inferSelect) {
  const [items, payments] = await Promise.all([
    db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoice.id)),
    db.select().from(invoicePaymentsTable).where(eq(invoicePaymentsTable.invoiceId, invoice.id)),
  ]);
  let customerName: string | undefined, customerEmail: string | undefined, customerPhone: string | undefined;
  if (invoice.customerId) {
    const [c] = await db.select().from(customersTable).where(eq(customersTable.id, invoice.customerId)).limit(1);
    customerName = c?.name; customerEmail = c?.email ?? undefined; customerPhone = c?.phone;
  }
  return {
    id: invoice.id, invoice_number: invoice.invoiceNumber,
    customer_id: invoice.customerId, customer_name: customerName ?? null,
    customer_email: customerEmail ?? null, customer_phone: customerPhone ?? null,
    subtotal: Number(invoice.subtotal), discount_amount: Number(invoice.discountAmount ?? 0),
    tax_amount: Number(invoice.taxAmount ?? 0), total: Number(invoice.total),
    amount_paid: Number(invoice.amountPaid ?? 0), balance_due: Number(invoice.balanceDue ?? 0),
    payment_status: invoice.paymentStatus, due_date: invoice.dueDate?.toISOString() ?? null,
    notes: invoice.notes, terms: invoice.terms, created_at: invoice.createdAt, updated_at: invoice.updatedAt,
    items: items.map(i => ({
      id: i.id, description: i.description, product_id: i.productId,
      quantity: Number(i.quantity), unit_price: Number(i.unitPrice),
      discount: Number(i.discount ?? 0), tax_rate: Number(i.taxRate ?? 0),
      total: Number(i.total),
    })),
    payments: payments.map(p => ({
      id: p.id, amount: Number(p.amount), method: p.method,
      reference: p.reference, notes: p.notes, created_at: p.createdAt,
    })),
  };
}

router.get("/invoices", async (req, res) => {
  try {
    const { status, customer_id, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = Math.min(parseInt(limit), 200);
    const offset = (pageNum - 1) * limitNum;
    const conditions = [];
    if (status) conditions.push(eq(invoicesTable.paymentStatus, status as any));
    if (customer_id) conditions.push(eq(invoicesTable.customerId, parseInt(customer_id)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [invoices, customers, [totalRow]] = await Promise.all([
      db.select().from(invoicesTable).where(where).orderBy(desc(invoicesTable.createdAt)).limit(limitNum).offset(offset),
      db.select({ id: customersTable.id, name: customersTable.name }).from(customersTable),
      db.select({ total: count() }).from(invoicesTable).where(where),
    ]);
    const custMap = new Map(customers.map(c => [c.id, c.name]));

    return res.json({
      data: invoices.map(inv => ({
        id: inv.id, invoice_number: inv.invoiceNumber,
        customer_id: inv.customerId, customer_name: inv.customerId ? custMap.get(inv.customerId) ?? null : null,
        subtotal: Number(inv.subtotal), discount_amount: Number(inv.discountAmount ?? 0),
        tax_amount: Number(inv.taxAmount ?? 0), total: Number(inv.total),
        amount_paid: Number(inv.amountPaid ?? 0), balance_due: Number(inv.balanceDue ?? 0),
        payment_status: inv.paymentStatus, due_date: inv.dueDate?.toISOString() ?? null,
        notes: inv.notes, created_at: inv.createdAt, updated_at: inv.updatedAt, items: [],
      })),
      total: Number(totalRow.total), page: pageNum, limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list invoices" });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const body = req.body;
    const items = body.items ?? [];
    const subtotal = items.reduce((s: number, i: any) => s + (i.unit_price * i.quantity - (i.discount ?? 0)), 0);
    const discountAmt = body.discount_amount ?? 0;
    const taxAmt = body.tax_amount ?? 0;
    const total = subtotal - discountAmt + taxAmt;
    const invoiceNumber = await getNextInvoiceNumber();

    const [invoice] = await db.insert(invoicesTable).values({
      invoiceNumber, customerId: body.customer_id,
      subtotal: subtotal.toString(), discountAmount: discountAmt.toString(),
      taxAmount: taxAmt.toString(), total: total.toString(),
      amountPaid: "0", balanceDue: total.toString(),
      paymentStatus: "unpaid",
      dueDate: body.due_date ? new Date(body.due_date) : undefined,
      notes: body.notes, terms: body.terms,
    }).returning();

    for (const item of items) {
      const itemTotal = item.unit_price * item.quantity - (item.discount ?? 0);
      await db.insert(invoiceItemsTable).values({
        invoiceId: invoice.id, description: item.description,
        productId: item.product_id, quantity: item.quantity.toString(),
        unitPrice: item.unit_price.toString(), discount: (item.discount ?? 0).toString(),
        taxRate: (item.tax_rate ?? 0).toString(), total: itemTotal.toString(),
      });
    }

    return res.status(201).json(await buildInvoice(invoice));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create invoice" });
  }
});

router.get("/invoices/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    return res.json(await buildInvoice(invoice));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get invoice" });
  }
});

router.patch("/invoices/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.due_date !== undefined) updates.dueDate = body.due_date ? new Date(body.due_date) : null;
    if (body.terms !== undefined) updates.terms = body.terms;
    const [invoice] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    return res.json(await buildInvoice(invoice));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update invoice" });
  }
});

router.post("/invoices/:id/payment", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount, method, reference, notes } = req.body as { amount: number; method: string; reference?: string; notes?: string };

    await db.insert(invoicePaymentsTable).values({
      invoiceId: id, amount: amount.toString(), method, reference, notes,
    });

    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const newAmountPaid = Number(invoice.amountPaid ?? 0) + amount;
    const total = Number(invoice.total);
    const newBalance = total - newAmountPaid;
    const newStatus = newBalance <= 0 ? "paid" : newAmountPaid > 0 ? "partial" : "unpaid";

    await db.update(invoicesTable).set({
      amountPaid: newAmountPaid.toString(),
      balanceDue: Math.max(0, newBalance).toString(),
      paymentStatus: newStatus as any,
      paidAt: newStatus === "paid" ? new Date() : undefined,
    }).where(eq(invoicesTable.id, id));

    const [updated] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
    return res.json(await buildInvoice(updated!));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to record payment" });
  }
});

// Quotations
router.get("/quotations", async (req, res) => {
  try {
    const { status, customer_id, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = Math.min(parseInt(limit), 200);
    const offset = (pageNum - 1) * limitNum;
    const conditions = [];
    if (status) conditions.push(eq(quotationsTable.status, status as any));
    if (customer_id) conditions.push(eq(quotationsTable.customerId, parseInt(customer_id)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [quotations, customers, [totalRow]] = await Promise.all([
      db.select().from(quotationsTable).where(where).orderBy(desc(quotationsTable.createdAt)).limit(limitNum).offset(offset),
      db.select({ id: customersTable.id, name: customersTable.name }).from(customersTable),
      db.select({ total: count() }).from(quotationsTable).where(where),
    ]);
    const custMap = new Map(customers.map(c => [c.id, c.name]));

    return res.json({
      data: quotations.map(q => ({
        id: q.id, quotation_number: q.quotationNumber,
        customer_id: q.customerId, customer_name: q.customerId ? custMap.get(q.customerId) ?? null : null,
        subtotal: Number(q.subtotal), discount_amount: Number(q.discountAmount ?? 0),
        tax_amount: Number(q.taxAmount ?? 0), total: Number(q.total),
        status: q.status, valid_until: q.validUntil?.toISOString() ?? null,
        notes: q.notes, created_at: q.createdAt, items: [],
      })),
      total: Number(totalRow.total), page: pageNum, limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list quotations" });
  }
});

router.post("/quotations", async (req, res) => {
  try {
    const body = req.body;
    const items = body.items ?? [];
    const subtotal = items.reduce((s: number, i: any) => s + (i.unit_price * i.quantity - (i.discount ?? 0)), 0);
    const discountAmt = body.discount_amount ?? 0;
    const taxAmt = body.tax_amount ?? 0;
    const total = subtotal - discountAmt + taxAmt;
    const quotationNumber = await getNextQuotationNumber();

    const [quotation] = await db.insert(quotationsTable).values({
      quotationNumber, customerId: body.customer_id,
      subtotal: subtotal.toString(), discountAmount: discountAmt.toString(),
      taxAmount: taxAmt.toString(), total: total.toString(),
      status: body.status ?? "draft",
      validUntil: body.valid_until ? new Date(body.valid_until) : undefined,
      notes: body.notes,
    }).returning();

    for (const item of items) {
      const itemTotal = item.unit_price * item.quantity - (item.discount ?? 0);
      await db.insert(quotationItemsTable).values({
        quotationId: quotation.id, description: item.description,
        productId: item.product_id, quantity: item.quantity.toString(),
        unitPrice: item.unit_price.toString(), discount: (item.discount ?? 0).toString(),
        total: itemTotal.toString(),
      });
    }

    const quotItems = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, quotation.id));
    return res.status(201).json({
      id: quotation.id, quotation_number: quotation.quotationNumber,
      customer_id: quotation.customerId, subtotal: Number(quotation.subtotal),
      discount_amount: Number(quotation.discountAmount ?? 0), tax_amount: Number(quotation.taxAmount ?? 0),
      total: Number(quotation.total), status: quotation.status,
      valid_until: quotation.validUntil?.toISOString() ?? null, notes: quotation.notes,
      created_at: quotation.createdAt,
      items: quotItems.map(i => ({
        description: i.description, product_id: i.productId,
        quantity: Number(i.quantity), unit_price: Number(i.unitPrice),
        discount: Number(i.discount ?? 0), total: Number(i.total),
      })),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create quotation" });
  }
});

router.get("/quotations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [quotation] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, id)).limit(1);
    if (!quotation) return res.status(404).json({ error: "Quotation not found" });
    const items = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, id));
    let customerName: string | undefined;
    if (quotation.customerId) {
      const [c] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, quotation.customerId)).limit(1);
      customerName = c?.name;
    }
    return res.json({
      id: quotation.id, quotation_number: quotation.quotationNumber,
      customer_id: quotation.customerId, customer_name: customerName ?? null,
      subtotal: Number(quotation.subtotal), discount_amount: Number(quotation.discountAmount ?? 0),
      tax_amount: Number(quotation.taxAmount ?? 0), total: Number(quotation.total),
      status: quotation.status, valid_until: quotation.validUntil?.toISOString() ?? null,
      notes: quotation.notes, created_at: quotation.createdAt,
      items: items.map(i => ({
        description: i.description, product_id: i.productId,
        quantity: Number(i.quantity), unit_price: Number(i.unitPrice),
        discount: Number(i.discount ?? 0), total: Number(i.total),
      })),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get quotation" });
  }
});

router.post("/quotations/:id/convert", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [quotation] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, id)).limit(1);
    if (!quotation) return res.status(404).json({ error: "Quotation not found" });

    const invoiceNumber = await getNextInvoiceNumber();
    const total = Number(quotation.total);

    const [invoice] = await db.insert(invoicesTable).values({
      invoiceNumber, customerId: quotation.customerId,
      subtotal: quotation.subtotal, discountAmount: quotation.discountAmount ?? "0",
      taxAmount: quotation.taxAmount ?? "0", total: quotation.total,
      amountPaid: "0", balanceDue: quotation.total,
      paymentStatus: "unpaid", notes: quotation.notes,
    }).returning();

    const qItems = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, id));
    for (const item of qItems) {
      await db.insert(invoiceItemsTable).values({
        invoiceId: invoice.id, description: item.description,
        productId: item.productId, quantity: item.quantity,
        unitPrice: item.unitPrice, discount: item.discount ?? "0",
        taxRate: "0", total: item.total,
      });
    }

    await db.update(quotationsTable).set({ status: "accepted", convertedToInvoiceId: invoice.id }).where(eq(quotationsTable.id, id));
    return res.status(201).json(await buildInvoice(invoice));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to convert quotation" });
  }
});

export default router;
