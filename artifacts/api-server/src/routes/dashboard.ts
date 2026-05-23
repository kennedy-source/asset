import { Router } from "express";
import { db, salesTable, saleItemsTable, customersTable, productsTable, embroideryJobsTable, printingJobsTable, invoicesTable, expensesTable } from "@workspace/db";
import { eq, gte, lte, and, count, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/reports/dashboard", async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      todaySalesAgg,
      todayExpensesAgg,
      totalCustomers,
      newCustomersToday,
      lowStockCount,
      pendingInvoices,
      embroideryByStatus,
      printingByStatus,
      recentSales,
      topProducts,
      monthlySales,
    ] = await Promise.all([
      db.select({
        revenue: sql<number>`COALESCE(SUM(${salesTable.total}), 0)`,
        cnt: count(),
      }).from(salesTable).where(and(
        gte(salesTable.createdAt, todayStart),
        lte(salesTable.createdAt, todayEnd),
        eq(salesTable.voided, false),
      )),
      db.select({
        total: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)`,
      }).from(expensesTable).where(and(
        gte(expensesTable.expenseDate, todayStart),
        lte(expensesTable.expenseDate, todayEnd),
      )),
      db.select({ total: count() }).from(customersTable).where(eq(customersTable.isActive, true)),
      db.select({ total: count() }).from(customersTable).where(gte(customersTable.createdAt, todayStart)),
      db.select({ total: count() }).from(productsTable).where(
        and(eq(productsTable.isActive, true), sql`${productsTable.stockQuantity} <= COALESCE(${productsTable.lowStockThreshold}, 5)`)
      ),
      db.select({
        cnt: count(),
        amount: sql<number>`COALESCE(SUM(${invoicesTable.balanceDue}), 0)`,
      }).from(invoicesTable).where(sql`${invoicesTable.paymentStatus} IN ('unpaid', 'partial')`),
      db.select({
        status: embroideryJobsTable.status,
        cnt: count(),
      }).from(embroideryJobsTable).groupBy(embroideryJobsTable.status),
      db.select({
        status: printingJobsTable.status,
        cnt: count(),
      }).from(printingJobsTable).groupBy(printingJobsTable.status),
      db.select().from(salesTable).where(eq(salesTable.voided, false)).orderBy(desc(salesTable.createdAt)).limit(5),
      db.select({
        product_id: saleItemsTable.productId,
        product_name: saleItemsTable.productName,
        quantity_sold: sql<number>`SUM(${saleItemsTable.quantity})`,
        revenue: sql<number>`SUM(${saleItemsTable.total})`,
      }).from(saleItemsTable)
        .where(gte(saleItemsTable.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
        .groupBy(saleItemsTable.productId, saleItemsTable.productName)
        .orderBy(sql`SUM(${saleItemsTable.total}) DESC`)
        .limit(5),
      db.select({
        period: sql<string>`TO_CHAR(DATE_TRUNC('month', ${salesTable.createdAt}), 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(${salesTable.total}), 0)`,
        cnt: count(),
      }).from(salesTable)
        .where(and(
          gte(salesTable.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
          eq(salesTable.voided, false),
        ))
        .groupBy(sql`DATE_TRUNC('month', ${salesTable.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${salesTable.createdAt})`),
    ]);

    const pendingJobs =
      embroideryByStatus.filter(s => !["delivered", "cancelled"].includes(s.status)).reduce((sum, s) => sum + Number(s.cnt), 0) +
      printingByStatus.filter(s => !["delivered", "cancelled"].includes(s.status)).reduce((sum, s) => sum + Number(s.cnt), 0);

    return res.json({
      today_revenue: Number(todaySalesAgg[0].revenue),
      today_sales_count: Number(todaySalesAgg[0].cnt),
      today_expenses: Number(todayExpensesAgg[0].total),
      total_customers: Number(totalCustomers[0].total),
      new_customers_today: Number(newCustomersToday[0].total),
      pending_jobs: pendingJobs,
      low_stock_count: Number(lowStockCount[0].total),
      pending_invoices: Number(pendingInvoices[0].cnt),
      pending_invoice_amount: Number(pendingInvoices[0].amount),
      embroidery_by_status: embroideryByStatus.map(s => ({ status: s.status, count: Number(s.cnt) })),
      printing_by_status: printingByStatus.map(s => ({ status: s.status, count: Number(s.cnt) })),
      recent_sales: recentSales.map(s => ({
        id: s.id, sale_number: s.saleNumber,
        total: Number(s.total), payment_method: s.paymentMethod,
        created_at: s.createdAt, items: [],
        customer_id: s.customerId, customer_name: null,
        cashier_id: s.cashierId, cashier_name: null,
        subtotal: Number(s.subtotal), discount_amount: Number(s.discountAmount ?? 0),
        tax_amount: Number(s.taxAmount ?? 0), amount_paid: Number(s.amountPaid),
        change_given: Number(s.changeGiven ?? 0), payment_status: s.paymentStatus,
        voided: s.voided, void_reason: s.voidReason, notes: s.notes,
      })),
      top_products: topProducts.map(p => ({
        product_id: p.product_id, product_name: p.product_name, sku: null,
        quantity_sold: Number(p.quantity_sold), revenue: Number(p.revenue),
      })),
      monthly_revenue: monthlySales.map(m => ({
        period: m.period, revenue: Number(m.revenue), count: Number(m.cnt),
      })),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get dashboard data" });
  }
});

router.get("/reports/sales/by-day", async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const data = await db.select({
      period: sql<string>`TO_CHAR(DATE_TRUNC('day', ${salesTable.createdAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`COALESCE(SUM(${salesTable.total}), 0)`,
      cnt: count(),
    }).from(salesTable)
      .where(and(gte(salesTable.createdAt, fromDate), lte(salesTable.createdAt, toDate), eq(salesTable.voided, false)))
      .groupBy(sql`DATE_TRUNC('day', ${salesTable.createdAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${salesTable.createdAt})`);

    return res.json(data.map(d => ({ period: d.period, revenue: Number(d.revenue), count: Number(d.cnt) })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get sales by day" });
  }
});

router.get("/reports/sales/by-month", async (req, res) => {
  try {
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString());
    const data = await db.select({
      period: sql<string>`TO_CHAR(DATE_TRUNC('month', ${salesTable.createdAt}), 'YYYY-MM')`,
      revenue: sql<number>`COALESCE(SUM(${salesTable.total}), 0)`,
      cnt: count(),
    }).from(salesTable)
      .where(and(
        gte(salesTable.createdAt, new Date(`${year}-01-01`)),
        lte(salesTable.createdAt, new Date(`${year}-12-31`)),
        eq(salesTable.voided, false),
      ))
      .groupBy(sql`DATE_TRUNC('month', ${salesTable.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${salesTable.createdAt})`);

    return res.json(data.map(d => ({ period: d.period, revenue: Number(d.revenue), count: Number(d.cnt) })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get sales by month" });
  }
});

router.get("/reports/sales/by-product", async (req, res) => {
  try {
    const { from, to, limit = "10" } = req.query as Record<string, string>;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const data = await db.select({
      product_id: saleItemsTable.productId,
      product_name: saleItemsTable.productName,
      sku: saleItemsTable.sku,
      quantity_sold: sql<number>`SUM(${saleItemsTable.quantity})`,
      revenue: sql<number>`SUM(${saleItemsTable.total})`,
    }).from(saleItemsTable)
      .where(and(gte(saleItemsTable.createdAt, fromDate), lte(saleItemsTable.createdAt, toDate)))
      .groupBy(saleItemsTable.productId, saleItemsTable.productName, saleItemsTable.sku)
      .orderBy(sql`SUM(${saleItemsTable.total}) DESC`)
      .limit(parseInt(limit));

    return res.json(data.map(d => ({
      product_id: d.product_id, product_name: d.product_name, sku: d.sku,
      quantity_sold: Number(d.quantity_sold), revenue: Number(d.revenue),
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get top products" });
  }
});

router.get("/reports/sales/by-payment-method", async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const conditions = [eq(salesTable.voided, false)];
    if (from) conditions.push(gte(salesTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(salesTable.createdAt, new Date(to)));

    const data = await db.select({
      method: salesTable.paymentMethod,
      amount: sql<number>`COALESCE(SUM(${salesTable.total}), 0)`,
      cnt: count(),
    }).from(salesTable).where(and(...conditions)).groupBy(salesTable.paymentMethod);

    return res.json(data.map(d => ({ method: d.method, amount: Number(d.amount), count: Number(d.cnt) })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get payment method breakdown" });
  }
});

router.get("/reports/inventory", async (req, res) => {
  try {
    const { low_stock, category } = req.query as Record<string, string>;
    const conditions = [eq(productsTable.isActive, true)];
    if (low_stock === "true") conditions.push(sql`${productsTable.stockQuantity} <= COALESCE(${productsTable.lowStockThreshold}, 5)`);

    const products = await db.select({
      id: productsTable.id, name: productsTable.name, sku: productsTable.sku,
      categoryId: productsTable.categoryId, stockQuantity: productsTable.stockQuantity,
      lowStockThreshold: productsTable.lowStockThreshold, price: productsTable.price,
      costPrice: productsTable.costPrice,
    }).from(productsTable).where(and(...conditions)).orderBy(productsTable.stockQuantity);

    return res.json(products.map(p => ({
      id: p.id, name: p.name, sku: p.sku, category_name: null,
      stock_quantity: p.stockQuantity, low_stock_threshold: p.lowStockThreshold,
      price: Number(p.price), cost_price: p.costPrice ? Number(p.costPrice) : null,
      stock_value: Number(p.price) * p.stockQuantity,
      is_low_stock: p.stockQuantity <= (p.lowStockThreshold ?? 5),
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get inventory report" });
  }
});

router.get("/reports/financial/profit-loss", async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const [salesAgg, expensesAgg, cogAgg] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(${salesTable.total}), 0)` }).from(salesTable)
        .where(and(gte(salesTable.createdAt, fromDate), lte(salesTable.createdAt, toDate), eq(salesTable.voided, false))),
      db.select({ total: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)` }).from(expensesTable)
        .where(and(gte(expensesTable.expenseDate, fromDate), lte(expensesTable.expenseDate, toDate))),
      db.select({ total: sql<number>`COALESCE(SUM(COALESCE(${saleItemsTable.costPrice}, 0) * ${saleItemsTable.quantity}), 0)` })
        .from(saleItemsTable).where(and(gte(saleItemsTable.createdAt, fromDate), lte(saleItemsTable.createdAt, toDate))),
    ]);

    const revenue = Number(salesAgg[0].total);
    const cog = Number(cogAgg[0].total);
    const grossProfit = revenue - cog;
    const expenses = Number(expensesAgg[0].total);
    const netProfit = grossProfit - expenses;

    return res.json({
      revenue, cost_of_goods: cog, gross_profit: grossProfit,
      gross_margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      expenses, net_profit: netProfit,
      net_margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      period_from: fromDate.toISOString(), period_to: toDate.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get P&L" });
  }
});

export default router;
