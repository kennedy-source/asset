import { db } from "@workspace/db";
import { invoicesTable, paymentsTable, salesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { computeBalance } from "../lib/finance";
import {
  assertTransition,
  paymentTransitions,
  type PaymentStatus,
} from "../lib/workflows";

export async function postPayment(input: {
  saleId?: number | null;
  invoiceId?: number | null;
  customerId?: number | null;
  amount: number;
  method: string;
  reference?: string | null;
}) {
  if (!input.saleId && !input.invoiceId) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Payment must reference a saleId or invoiceId",
    );
  }
  if (input.saleId && input.invoiceId) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Payment cannot reference both saleId and invoiceId",
    );
  }

  return db.transaction(async (tx: any) => {
    const normalizedReference = input.reference?.trim() || null;
    if (normalizedReference) {
      const [existingPayment] = await tx
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.reference, normalizedReference))
        .limit(1);
      if (existingPayment) {
        logger.info(
          { paymentId: existingPayment.id, reference: normalizedReference },
          "Payment already exists for reference; returning existing record",
        );
        return existingPayment;
      }
    }

    let customerId = input.customerId ?? null;

    if (input.invoiceId != null) {
      const invoiceRows = await tx
        .select()
        .from(invoicesTable)
        .where(eq(invoicesTable.id, input.invoiceId))
        .limit(1);
      if (!invoiceRows[0])
        throw new AppError(404, "NOT_FOUND", "Invoice not found");
      customerId = customerId ?? invoiceRows[0].customerId ?? null;

      const nextPaid = Number(invoiceRows[0].amountPaid) + Number(input.amount);
      const nextBalance = computeBalance(
        Number(invoiceRows[0].total),
        nextPaid,
        true,
      );
      await tx.execute(sql`
        UPDATE invoices
        SET amount_paid = ${nextPaid},
            balance = ${nextBalance},
            status = ${nextBalance === 0 ? "paid" : "partial"},
            updated_at = now()
        WHERE id = ${invoiceRows[0].id}
      `);
    }

    if (input.saleId != null) {
      const saleRows = await tx
        .select()
        .from(salesTable)
        .where(eq(salesTable.id, input.saleId))
        .limit(1);
      if (!saleRows[0]) throw new AppError(404, "NOT_FOUND", "Sale not found");
      customerId = customerId ?? saleRows[0].customerId ?? null;

      const nextPaid = Number(saleRows[0].amountPaid) + Number(input.amount);
      const nextBalance = computeBalance(
        Number(saleRows[0].total),
        nextPaid,
        true,
      );
      await tx.execute(sql`
        UPDATE sales
        SET amount_paid = ${nextPaid},
            balance = ${nextBalance},
            payment_status = ${nextBalance === 0 ? "paid" : "partial"},
            updated_at = now()
        WHERE id = ${saleRows[0].id}
      `);
    }

    let createdPayment: any;
    try {
      [createdPayment] = await tx
        .insert(paymentsTable)
        .values({
          saleId: input.saleId ?? null,
          invoiceId: input.invoiceId ?? null,
          customerId,
          amount: input.amount,
          method: input.method,
          status: "COMPLETED",
          reference: normalizedReference,
        })
        .returning();
    } catch (error: any) {
      const isUniqueViolation = normalizedReference && (
        error?.code === "23505" ||
        String(error?.message).toLowerCase().includes("unique") ||
        String(error?.message).toLowerCase().includes("constraint")
      );
      if (isUniqueViolation) {
        const [existingPayment] = await tx
          .select()
          .from(paymentsTable)
          .where(eq(paymentsTable.reference, normalizedReference))
          .limit(1);
        if (existingPayment) {
          logger.info(
            { paymentId: existingPayment.id, reference: normalizedReference },
            "Unique payment reference already exists; returning existing record",
          );
          return existingPayment;
        }
      }
      throw error;
    }

    logger.info({ paymentId: createdPayment.id, reference: createdPayment.reference }, "Payment created");
    return createdPayment;
  });
}

// Pesapal reconciliation removed
