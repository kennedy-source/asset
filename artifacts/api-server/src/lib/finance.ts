import { AppError } from "./errors";

export function assertNonNegativeMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError(
      400,
      "INVALID_MONETARY_STATE",
      `${field} must be a non-negative number`,
    );
  }
}

export function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${field} must be a non-negative integer`,
    );
  }
}

export function computeBalance(
  total: number,
  amountPaid: number,
  allowOverpayment = false,
): number {
  const balance = Number((total - amountPaid).toFixed(2));
  if (balance < 0 && !allowOverpayment) {
    throw new AppError(
      400,
      "INVALID_MONETARY_STATE",
      "Amount paid cannot exceed total without explicit override",
    );
  }
  return balance;
}
