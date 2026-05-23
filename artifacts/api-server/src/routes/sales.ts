import { Router } from "express";
import { db, salesTable, saleItemsTable, productsTable, customersTable, usersTable, stockMovementsTable } from "@workspace/db";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";

const router = Router();

async function getNextSaleNumber(): Promise<string> {
  const [last] = await db.select({ saleNumber: salesTable.saleNumber })
    .from(salesTable).orderBy(desc(salesTable.id)).limit(1);
  if (!last) return "SALE-0001";
  const num = parseInt(last.saleNumber.split("-")[1] || "0") + 1;
  return `SALE-${num.toString().padStart(4, "0")}`;
}

function toSale(s: any, items: any[] = [], customerName?: string, cashierName?: string) {
  return {
    id: s.id, sale_number: s.saleNumber,
    customer_id: s.customerId, customer_name: customerName ?? null,
    cashier_id: s.cashierId, cashier_name: cashierName ?? null,
    subtotal: Number(s.subtotal), discount_amount: Number(s.discountAmount ?? 0),
    tax_amount: Number(s.taxAmount ?? 0), total: Number(s.total),
    amount_paid: Number(s.amountPaid), change_given: Number(s.changeGiven ?? 0),
    payment_method: s.paymentMethod, payment_status: s.paymentStatus,
    voided: s.voided, void_reason: s.voidReason, notes: s.notes,
    created_at: s.createdAt, items,
  };
}

function toItem(i: any) {
  return {
    product_id: i.productId, product_name: i.productName, sku: i.sku,
    quantity: i.quantity, unit_price: Number(i.unitPrice),
    cost_price: i.costPrice ? Number(i.costPrice) : null,
    discount: Number(i.discount ?? 0), total: Number(i.total),
  };
}

router.get("/sales", async (req, res) => {
  try {
    const { from, to, payment_method, cashier_id, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = Math.min(parseInt(limit), 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (from) conditions.push(gte(salesTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(salesTable.createdAt, new Date(to)));
    if (payment_method) conditions.push(eq(salesTable.paymentMethod, payment_method as any));
    if (cashier_id) conditions.push(eq(salesTable.cashierId, parseInt(cashier_id)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [sales, customers, users, [totalRow]] = await Promise.all([
      db.select().from(salesTable).where(where).orderBy(desc(salesTable.createdAt)).limit(limitNum).offset(offset),
      db.select({ id: customersTable.id, name: customersTable.name }).from(customersTable),
      db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable),
      db.select({ total: count() }).from(salesTable).where(where),
    ]);

    const custMap = new Map(customers.map(c => [c.id, c.name]));
    const userMap = new Map(users.map(u => [u.id, u.name]));

    return res.json({
      data: sales.map(s => toSale(s, [], s.customerId ? custMap.get(s.customerId) : undefined, s.cashierId ? userMap.get(s.cashierId) : undefined)),
      total: Number(totalRow.total), page: pageNum, limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to list sales" });
  }
});

router.get("/sales/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id)).limit(1);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));

    let customerName: string | undefined;
    let cashierName: string | undefined;
    if (sale.customerId) {
      const [c] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, sale.customerId)).limit(1);
      customerName = c?.name;
    }
    if (sale.cashierId) {
      const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, sale.cashierId)).limit(1);
      cashierName = u?.name;
    }
    return res.json(toSale(sale, items.map(toItem), customerName, cashierName));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get sale" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const body = req.body;
    if (!body.items?.length) return res.status(400).json({ error: "Items required" });

    const saleNumber = await getNextSaleNumber();
    const subtotal = body.items.reduce((sum: number, i: any) => sum + (i.unit_price * i.quantity), 0);
    const discountAmt = body.discount_value ?? 0;
    const taxAmt = body.tax_amount ?? 0;
    const total = body.total ?? (subtotal - discountAmt + taxAmt);
    const changeGiven = Math.max(0, (body.amount_paid ?? total) - total);

    const [sale] = await db.insert(salesTable).values({
      saleNumber, customerId: body.customer_id,
      subtotal: subtotal.toString(), discountAmount: discountAmt.toString(),
      taxAmount: taxAmt.toString(), total: total.toString(),
      amountPaid: (body.amount_paid ?? total).toString(),
      changeGiven: changeGiven.toString(),
      paymentMethod: body.payment_method ?? "cash",
      paymentStatus: "paid", notes: body.notes,
    }).returning();

    // Insert items and update stock
    for (const item of body.items) {
      await db.insert(saleItemsTable).values({
        saleId: sale.id, productId: item.product_id,
        productName: item.product_name, sku: item.sku,
        quantity: item.quantity, unitPrice: item.unit_price.toString(),
        discount: (item.discount ?? 0).toString(),
        total: (item.unit_price * item.quantity - (item.discount ?? 0)).toString(),
      });
      if (item.product_id) {
        await db.update(productsTable).set({
          stockQuantity: sql`${productsTable.stockQuantity} - ${item.quantity}`,
        }).where(eq(productsTable.id, item.product_id));
        await db.insert(stockMovementsTable).values({
          productId: item.product_id, type: "sale",
          quantity: -item.quantity, referenceType: "sale", referenceId: sale.id,
        });
      }
    }

    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
    return res.status(201).json(toSale(sale, items.map(toItem)));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create sale" });
  }
});

router.post("/sales/:id/void", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body as { reason: string };
    const [sale] = await db.update(salesTable).set({
      voided: true, voidReason: reason, voidedAt: new Date(),
    }).where(eq(salesTable.id, id)).returning();
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    // Restore stock
    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));
    for (const item of items) {
      if (item.productId) {
        await db.update(productsTable).set({
          stockQuantity: sql`${productsTable.stockQuantity} + ${item.quantity}`,
        }).where(eq(productsTable.id, item.productId));
      }
    }

    return res.json(toSale(sale, items.map(toItem)));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to void sale" });
  }
});

export default router;
