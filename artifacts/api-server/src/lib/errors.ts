export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "INVALID_MONETARY_STATE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;
  readonly exposeDetails: boolean;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    options?: { details?: unknown; exposeDetails?: boolean },
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.exposeDetails = Boolean(options?.exposeDetails);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
