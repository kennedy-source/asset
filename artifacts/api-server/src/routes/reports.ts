import { Router } from "express";
import { db } from "@workspace/db";
import {
  salesTable,
  productsTable,
  saleItemsTable,
  expensesTable,
  categoriesTable,
} from "@workspace/db";
import { eq, gte, lte, and, sql } from "drizzle-orm";
import {
  GetSalesReportQueryParams,
  GetExpensesReportQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/sales", async (req, res): Promise<void> => {
  const qp = GetSalesReportQueryParams.safeParse(req.query);
  const { period, startDate, endDate } = qp.success ? qp.data : {};
  // extra filters (optional)
  const paymentMethod = typeof req.query?.paymentMethod === "string" ? String(req.query.paymentMethod).trim() : undefined;
  const categoryId = req.query?.categoryId != null ? Number(req.query.categoryId) : undefined;
  const customerId = req.query?.customerId != null ? Number(req.query.customerId) : undefined;
  const viewMode = typeof req.query?.viewMode === "string" ? String(req.query.viewMode).trim() : undefined;

  let groupBy = "DATE(created_at)";
  if (period === "weekly") groupBy = "DATE_TRUNC('week', created_at)";
  if (period === "monthly") groupBy = "DATE_TRUNC('month', created_at)";

  const conditions: any[] = [];
  if (startDate) conditions.push(gte(salesTable.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(salesTable.createdAt, new Date(endDate)));
  if (paymentMethod) conditions.push(eq(salesTable.paymentMethod, paymentMethod));
  if (customerId) conditions.push(eq(salesTable.customerId, customerId));

  let data: any[] = [];
  if (categoryId) {
    // aggregate by sale items filtered by product category (join through sales for dates)
    data = (await db
      .select({
        date: sql<string>`${groupBy}::text`,
        total: sql<number>`COALESCE(SUM(${saleItemsTable.total}), 0)`,
        count: sql<number>`COUNT(DISTINCT ${saleItemsTable.saleId})`,
      })
      .from(saleItemsTable)
      .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          ...(conditions.length ? [and(...conditions)] : []),
        ),
      )
      .groupBy(sql`${groupBy}`)
      .orderBy(sql`${groupBy}`)) as any[];
  } else {
    data = (await db
      .select({
        date: sql<string>`${groupBy}::text`,
        total: sql<number>`COALESCE(SUM(total), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(salesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(sql`${groupBy}`)
      .orderBy(sql`${groupBy}`)) as any[];
  }

  const totalSales = data.reduce((s: number, r: any) => s + Number(r.total), 0);
  const totalTransactions = data.reduce(
    (s: number, r: any) => s + Number(r.count),
    0,
  );

  res.json({
    totalSales,
    totalTransactions,
    averageSale: totalTransactions > 0 ? totalSales / totalTransactions : 0,
    data,
  });
});

router.get("/inventory", async (_req, res): Promise<void> => {
  const all = (await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.isActive, true))) as any[];
  const totalValue = all.reduce(
    (s, p) => s + p.sellingPrice * p.stockQuantity,
    0,
  );
  const lowStockItems = all.filter((p) => p.stockQuantity <= p.reorderLevel);
  const outOfStockCount = all.filter((p) => p.stockQuantity === 0).length;

  res.json({
    totalProducts: all.length,
    totalValue,
    lowStockItems: lowStockItems.map((p) => ({ ...p, categoryName: null })),
    outOfStockCount,
  });
});

router.get("/best-sellers", async (_req, res): Promise<void> => {
  const rows = (await db
    .select({
      productId: saleItemsTable.productId,
      productName: productsTable.name,
      totalQuantity: sql<number>`COALESCE(SUM(${saleItemsTable.quantity}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${saleItemsTable.total}), 0)`,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .groupBy(saleItemsTable.productId, productsTable.name)
    .orderBy(sql`SUM(${saleItemsTable.quantity}) DESC`)
    .limit(20)) as any[];

  res.json(
    rows.map((r) => ({
      productId: r.productId,
      productName: r.productName ?? "Unknown",
      totalQuantity: Number(r.totalQuantity),
      totalRevenue: Number(r.totalRevenue),
    })),
  );
});

router.get("/expenses", async (req, res): Promise<void> => {
  const qp = GetExpensesReportQueryParams.safeParse(req.query);
  const { startDate, endDate } = qp.success ? qp.data : {};

  const conditions = [];
  if (startDate)
    conditions.push(gte(expensesTable.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(expensesTable.createdAt, new Date(endDate)));

  const rows = (await db
    .select({
      category: sql<string>`COALESCE(${expensesTable.category}, 'General')`,
      total: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)`,
    })
    .from(expensesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(sql`COALESCE(${expensesTable.category}, 'General')`)) as any[];

  const totalExpenses = rows.reduce(
    (s: number, r: any) => s + Number(r.total),
    0,
  );

  res.json({
    totalExpenses,
    byCategory: rows.map((r) => ({
      category: r.category,
      total: Number(r.total),
    })),
  });
});

export default router;
