import { AppError } from "./errors";

export type PaginationInput = { page?: number | null; limit?: number | null };
export type Pagination = { page: number; limit: number; offset: number };

export function resolvePagination(input: PaginationInput): Pagination {
  const page = input.page == null ? 1 : Number(input.page);
  const limit = input.limit == null ? 50 : Number(input.limit);
  if (!Number.isFinite(page) || page < 1)
    throw new AppError(400, "VALIDATION_ERROR", "Invalid page");
  if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid limit (1-200)");
  }
  return { page, limit, offset: (page - 1) * limit };
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
): PaginationInput {
  const parseValue = (value: unknown): number | undefined => {
    if (value == null) return undefined;
    if (Array.isArray(value)) value = value[0];
    if (typeof value === "number") return Number(value);
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }
    return undefined;
  };

  return {
    page: parseValue(query.page),
    limit: parseValue(query.limit),
  };
}
