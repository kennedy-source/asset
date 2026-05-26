import { Router } from "express";
import { db, pool } from "@workspace/db";
import {
  salesTable,
  productsTable,
  embroideryJobsTable,
  printingJobsTable,
  invoicesTable,
  customersTable,
  categoriesTable,
  saleItemsTable,
} from "@workspace/db";
import { eq, gte, sql, and, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function getSummary(_req, res): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    salesToday,
    salesMonth,
    inventory,
    lowStock,
    pendingEmb,
    pendingPrn,
    pendingInv,
    unpaid,
    customers,
    products,
  ] = await Promise.all([
    pool.query("SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE created_at >= $1", [today]),
    pool.query("SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE created_at >= $1", [monthStart]),
    pool.query("SELECT COALESCE(SUM(COALESCE(selling_price, price, 0) * COALESCE(stock_quantity, 0)), 0) AS total FROM products WHERE COALESCE(is_active, true) = true"),
    pool.query("SELECT COUNT(*) AS total FROM products WHERE COALESCE(is_active, true) = true AND COALESCE(stock_quantity, 0) <= COALESCE(reorder_level, 0)"),
    pool.query("SELECT COUNT(*) AS total FROM embroidery_jobs WHERE lower(status::text) NOT IN ('completed','delivered','cancelled')"),
    pool.query("SELECT COUNT(*) AS total FROM printing_jobs WHERE lower(status::text) NOT IN ('completed','delivered','cancelled')"),
    pool.query("SELECT COUNT(*) AS total FROM invoices WHERE lower(COALESCE(status, payment_status::text, 'unpaid')) NOT IN ('paid')"),
    pool.query("SELECT COALESCE(SUM(COALESCE(balance, balance_due, 0)), 0) AS total FROM invoices WHERE lower(COALESCE(status, payment_status::text, 'unpaid')) NOT IN ('paid')"),
    pool.query("SELECT COUNT(*) AS total FROM customers"),
    pool.query("SELECT COUNT(*) AS total FROM products WHERE COALESCE(is_active, true) = true"),
  ]);

  res.json({
    salesToday: Number(salesToday.rows[0]?.total ?? 0),
    salesThisMonth: Number(salesMonth.rows[0]?.total ?? 0),
    inventoryValue: Number(inventory.rows[0]?.total ?? 0),
    lowStockCount: Number(lowStock.rows[0]?.total ?? 0),
    pendingEmbroideryJobs: Number(pendingEmb.rows[0]?.total ?? 0),
    pendingPrintingJobs: Number(pendingPrn.rows[0]?.total ?? 0),
    pendingInvoices: Number(pendingInv.rows[0]?.total ?? 0),
    unpaidBalance: Number(unpaid.rows[0]?.total ?? 0),
    totalCustomers: Number(customers.rows[0]?.total ?? 0),
    totalProducts: Number(products.rows[0]?.total ?? 0),
  });
}

router.get("/", getSummary);
router.get("/summary", getSummary);

router.get("/sales-chart", async (_req, res): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await db
      .select({
        date: sql<string>`DATE(${salesTable.createdAt})`,
        total: sql<number>`COALESCE(SUM(${salesTable.total}),0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(salesTable)
      .where(gte(salesTable.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${salesTable.createdAt})`)
      .orderBy(sql`DATE(${salesTable.createdAt})`);

    res.json(rows);
  } catch (error) {
    console.error("Sales chart error:", error);
    res.status(500).json({ error: "Failed to fetch sales chart data", details: String(error) });
  }
});

router.get("/category-sales", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      category: sql<string>`COALESCE(${categoriesTable.name}, 'Uncategorized')`,
      total: sql<number>`COALESCE(SUM(${saleItemsTable.total}),0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .groupBy(sql`COALESCE(${categoriesTable.name}, 'Uncategorized')`)
    .orderBy(sql`SUM(${saleItemsTable.total}) DESC`);

  res.json(rows);
});

export default router;
