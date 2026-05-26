import { AppError } from "./errors";

export type TransitionResult<S extends string> = {
  from: S;
  to: S;
};

export function assertTransition<S extends string>(
  entity: string,
  from: S,
  to: S,
  allowed: Record<S, readonly S[]>,
): TransitionResult<S> {
  if (from === to) return { from, to };
  const possible = allowed[from] ?? [];
  if (!possible.includes(to)) {
    throw new AppError(
      409,
      "CONFLICT",
      `Invalid ${entity} status transition: ${from} -> ${to}`,
      { details: { from, to, allowed: possible }, exposeDetails: true },
    );
  }
  return { from, to };
}

// ---------------------------------------------------------------------------
// Workflow definitions (P2)
// ---------------------------------------------------------------------------

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export const quotationTransitions: Record<
  QuotationStatus,
  readonly QuotationStatus[]
> = {
  DRAFT: ["SENT", "REJECTED", "EXPIRED", "ACCEPTED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["CONVERTED"],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export const invoiceTransitions: Record<
  InvoiceStatus,
  readonly InvoiceStatus[]
> = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["PARTIAL", "PAID", "OVERDUE", "CANCELLED"],
  PARTIAL: ["PAID", "OVERDUE", "CANCELLED"],
  PAID: [],
  OVERDUE: ["PARTIAL", "PAID", "CANCELLED"],
  CANCELLED: [],
};

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
export const paymentTransitions: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  PENDING: ["COMPLETED", "FAILED"],
  COMPLETED: ["REVERSED"],
  FAILED: ["PENDING", "COMPLETED"],
  REVERSED: [],
};

export type ProductionStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export const productionTransitions: Record<
  ProductionStatus,
  readonly ProductionStatus[]
> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export type EmbroideryStatus =
  | "PENDING"
  | "DESIGNING"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";
export const embroideryTransitions: Record<
  EmbroideryStatus,
  readonly EmbroideryStatus[]
> = {
  PENDING: ["DESIGNING", "CANCELLED"],
  DESIGNING: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export type PrintingStatus =
  | "PENDING"
  | "DESIGNING"
  | "APPROVED"
  | "PRINTING"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";
export const printingTransitions: Record<
  PrintingStatus,
  readonly PrintingStatus[]
> = {
  PENDING: ["DESIGNING", "CANCELLED"],
  DESIGNING: ["APPROVED", "CANCELLED"],
  APPROVED: ["PRINTING", "CANCELLED"],
  PRINTING: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
