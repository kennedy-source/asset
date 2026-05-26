// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import {
  salesTable,
  saleItemsTable,
  productsTable,
  customersTable,
  usersTable,
  stockMovementsTable,
  paymentsTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { CreateSaleBody, ListSalesQueryParams } from "@workspace/api-zod";
import { requireAuth, hasRole } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import { nextSequence } from "../lib/sequences";
import { roles } from "../lib/rbac";
import { AppError } from "../lib/errors";
import {
  assertNonNegativeInteger,
  assertNonNegativeMoney,
  computeBalance,
} from "../lib/finance";
import { parsePaginationQuery, resolvePagination } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

function normalizeSaleBody(body: any) {
  const items = Array.isArray(body?.items) ? body.items : [];
  const normalizedItems = items.map((item: any) => {
    const quantity = Number(item?.quantity ?? 0);
    const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? 0);
    return {
      product_id: Number(item?.productId ?? item?.product_id),
      product_name: item?.productName ?? item?.product_name ?? item?.name ?? "Product",
      sku: item?.sku ?? null,
      quantity,
      unit_price: unitPrice,
      total: Number(item?.total ?? quantity * unitPrice),
    };
  });
  const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + item.total, 0);
  const discount = Number(body?.discount ?? body?.discount_value ?? 0);
  const tax = Number(body?.tax ?? body?.tax_amount ?? 0);
  const total = Number(body?.total ?? subtotal - discount + tax);

  return {
    customer_id: body?.customerId ?? body?.customer_id ?? null,
    items: normalizedItems,
    discount_type: body?.discount_type ?? null,
    discount_value: discount,
    tax_amount: tax,
    payment_method: body?.paymentMethod ?? body?.payment_method ?? "CASH",
    amount_paid: Number(body?.amountPaid ?? body?.amount_paid ?? 0),
    total,
    notes: body?.notes ?? null,
  };
}

router.get("/", async (req, res): Promise<void> => {
  const qp = ListSalesQueryParams.safeParse(req.query);
  const { startDate, endDate } = qp.success ? qp.data : {};
  const { page, limit } = parsePaginationQuery(
    req.query as Record<string, unknown>,
  );
  const pg = resolvePagination({ page, limit });

  const conditions = [];
  if (startDate)
    conditions.push(gte(salesTable.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(salesTable.createdAt, new Date(endDate)));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(salesTable)
    .where(where);

  const rows = await db
    .select({
      id: salesTable.id,
      saleNumber: salesTable.saleNumber,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      subtotal: salesTable.subtotal,
      discount: salesTable.discount,
      tax: salesTable.tax,
      total: salesTable.total,
      amountPaid: salesTable.amountPaid,
      balance: salesTable.balance,
      paymentStatus: salesTable.paymentStatus,
      paymentMethod: salesTable.paymentMethod,
      cashierId: salesTable.cashierId,
      cashierName: usersTable.name,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .leftJoin(usersTable, eq(salesTable.cashierId, usersTable.id))
    .where(where)
    .orderBy(salesTable.createdAt)
    .limit(pg.limit)
    .offset(pg.offset);

  res.json({
    items: rows,
    page: pg.page,
    limit: pg.limit,
    total: Number(total),
  });
});

router.post("/", async (req, res): Promise<void> => {
  if (!hasRole(req.user?.role, ...roles.sales))
    throw new AppError(403, "FORBIDDEN", "Forbidden");
  const normalizedBody = normalizeSaleBody(req.body);
  const parsed = CreateSaleBody.safeParse(normalizedBody);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid sale payload", {
      details: parsed.error.flatten(),
      exposeDetails: true,
    });
  }

  const {
    items,
    customer_id: customerId,
    discount_value: discount = 0,
    tax_amount: tax = 0,
    amount_paid: amountPaid,
    payment_method: paymentMethod,
  } = parsed.data;
  assertNonNegativeMoney(discount, "discount");
  assertNonNegativeMoney(tax, "tax");
  assertNonNegativeMoney(amountPaid, "amountPaid");

  // Calculate totals
  for (const item of items) {
    assertNonNegativeInteger(item.quantity, "item.quantity");
    assertNonNegativeMoney(item.unit_price, "item.unitPrice");
  }
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  assertNonNegativeMoney(subtotal, "subtotal");
  const total = subtotal - discount + tax;
  assertNonNegativeMoney(total, "total");
  const balance = computeBalance(total, amountPaid, true);
  const paymentStatus =
    amountPaid >= total ? "paid" : amountPaid > 0 ? "partial" : "unpaid";
  const paymentMethodValue = String(paymentMethod).toLowerCase() === "paystack"
    ? "paystack"
    : String(paymentMethod).toLowerCase() === "bank_transfer"
      ? "bank"
      : String(paymentMethod).toLowerCase();

  const saleNumber = await nextSequence("seq_sales", "SAL");
  const canOverrideStock = hasRole(req.user?.role, ...roles.adminOnly);
  const sale = await db.transaction(async (tx: any) => {
    const [createdSale] = await tx
      .insert(salesTable)
      .values({
        saleNumber,
        customerId: customerId ?? null,
        subtotal,
        discount,
        tax,
        total,
        amountPaid,
        balance,
        paymentStatus,
        paymentMethod: paymentMethodValue,
        cashierId: req.user?.id ?? null,
      })
      .returning();

    for (const item of items) {
      const product = await tx
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, item.product_id))
        .limit(1);
      if (!product[0]) {
        throw new AppError(
          404,
          "NOT_FOUND",
          `Product ${item.product_id} not found`,
        );
      }
      const nextQty = product[0].stockQuantity - item.quantity;
      if (nextQty < 0 && !canOverrideStock) {
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          `Insufficient stock for ${product[0].name}`,
          {
            details: {
            productId: item.product_id,
              available: product[0].stockQuantity,
              requested: item.quantity,
            },
            exposeDetails: true,
          },
        );
      }

      await tx.insert(saleItemsTable).values({
        saleId: createdSale.id,
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.quantity * item.unit_price,
      });
      await tx.execute(
        sql`UPDATE products SET stock_quantity = ${nextQty}, updated_at = now() WHERE id = ${item.product_id}`,
      );
      await tx.insert(stockMovementsTable).values({
        productId: item.product_id,
        type: "sale",
        quantity: item.quantity,
        reason: "SALE",
        reference: saleNumber,
        userId: req.user?.id ?? null,
      });
    }
    if (amountPaid > 0) {
      await tx.insert(paymentsTable).values({
        saleId: createdSale.id,
        customerId: customerId ?? null,
        amount: amountPaid,
        method: paymentMethodValue.toUpperCase(),
        status: paymentStatus === "paid" ? "COMPLETED" : "PENDING",
        reference: saleNumber,
      });
    }
    return createdSale;
  });

  await logAudit(req, "CREATE_SALE", "Sale", sale.id, null, {
    total,
    paymentMethod: paymentMethodValue,
  });
  res
    .status(201)
    .json({ ...sale, customerName: null, cashierName: req.user?.name ?? null });
});

router.get("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const rows = await db
    .select({
      id: salesTable.id,
      saleNumber: salesTable.saleNumber,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      subtotal: salesTable.subtotal,
      discount: salesTable.discount,
      tax: salesTable.tax,
      total: salesTable.total,
      amountPaid: salesTable.amountPaid,
      balance: salesTable.balance,
      paymentStatus: salesTable.paymentStatus,
      paymentMethod: salesTable.paymentMethod,
      cashierId: salesTable.cashierId,
      cashierName: usersTable.name,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .leftJoin(usersTable, eq(salesTable.cashierId, usersTable.id))
    .where(eq(salesTable.id, id))
    .limit(1);

  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const saleItems = await db
    .select({
      id: saleItemsTable.id,
      productId: saleItemsTable.productId,
      productName: productsTable.name,
      quantity: saleItemsTable.quantity,
      unitPrice: saleItemsTable.unitPrice,
      total: saleItemsTable.total,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(eq(saleItemsTable.saleId, id));

  res.json({ ...rows[0], items: saleItems });
});

export default router;
