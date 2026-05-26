export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

type QueryOptions = { query?: Record<string, unknown>; request?: RequestInit };
type MutationOptions = { mutation?: Record<string, unknown>; request?: RequestInit };

const jsonBody = (data: unknown) =>
  data == null
    ? undefined
    : {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };

const compatQuery = <T>(
  queryKey: readonly unknown[],
  url: string,
  options?: QueryOptions,
) =>
  useQuery<T>({
    queryKey,
    queryFn: () => customFetch<T>(url, { ...options?.request }),
    ...(options?.query as object),
  });

const compatMutation = <T = unknown>(
  method: string,
  getUrl: (variables: any) => string,
  options?: MutationOptions,
) =>
  useMutation<T, unknown, any>({
    mutationFn: (variables) =>
      customFetch<T>(getUrl(variables), {
        method,
        ...jsonBody(variables?.data ?? variables),
        ...options?.request,
      }),
    ...(options?.mutation as object),
  });

export const getGetDashboardSummaryQueryKey = () =>
  ["/api/dashboard/summary"] as const;
export const useGetDashboardSummary = (options?: QueryOptions) =>
  compatQuery<any>(getGetDashboardSummaryQueryKey(), "/api/dashboard", options);
export const useGetSalesChart = (options?: QueryOptions) =>
  compatQuery<any[]>(["/api/dashboard/sales-chart"], "/api/dashboard/sales-chart", options);
export const useGetCategorySales = (options?: QueryOptions) =>
  compatQuery<any[]>(["/api/dashboard/category-sales"], "/api/dashboard/category-sales", options);

export const getListAiScansQueryKey = () => ["/api/ai-scans"] as const;
export const useCreateAiScan = (options?: MutationOptions) =>
  compatMutation("POST", () => "/api/ai-scans", options);

export const getListPaymentsQueryKey = (params?: unknown) =>
  ["/api/payments", params] as const;
export const useListPayments = (params?: unknown, options?: QueryOptions) =>
  compatQuery<any>(getListPaymentsQueryKey(params), "/api/payments", options);

export const getListProductionOrdersQueryKey = (params?: unknown) =>
  ["/api/production", params] as const;
export const useListProductionOrders = (params?: unknown, options?: QueryOptions) =>
  compatQuery<any>(getListProductionOrdersQueryKey(params), "/api/production", options);
export const useCreateProductionOrder = (options?: MutationOptions) =>
  compatMutation("POST", () => "/api/production", options);
export const useUpdateProductionOrder = (options?: MutationOptions) =>
  compatMutation("PATCH", (variables) => `/api/production/${variables?.id ?? ""}`, options);

export const useUpdateQuotation = (options?: MutationOptions) =>
  compatMutation("PATCH", (variables) => `/api/quotations/${variables?.id ?? ""}`, options);

export const getGetSalesReportQueryKey = (params?: unknown) =>
  ["/api/reports/sales", params] as const;
export const useGetSalesReport = (params?: unknown, options?: QueryOptions) =>
  compatQuery<any>(getGetSalesReportQueryKey(params), "/api/reports/sales", options);
export const getGetExpensesReportQueryKey = (params?: unknown) =>
  ["/api/reports/expenses", params] as const;
export const useGetExpensesReport = (params?: unknown, options?: QueryOptions) =>
  compatQuery<any>(getGetExpensesReportQueryKey(params), "/api/reports/expenses", options);
export const useGetBestSellers = (options?: QueryOptions) =>
  compatQuery<any[]>(["/api/reports/best-sellers"], "/api/reports/best-sellers", options);

export const useRegister = (options?: MutationOptions) =>
  compatMutation("POST", () => "/api/auth/register", options);
export const useUpsertSetting = (options?: MutationOptions) =>
  compatMutation("PUT", () => "/api/settings", options);
export const useDeleteUser = (options?: MutationOptions) =>
  compatMutation("DELETE", (variables) => `/api/users/${variables?.id ?? variables}`, options);
export const useDeleteSupplier = (options?: MutationOptions) =>
  compatMutation("DELETE", (variables) => `/api/suppliers/${variables?.id ?? variables}`, options);

export const getListStockMovementsQueryKey = (params?: unknown) =>
  ["/api/stock", params] as const;
export const useListStockMovements = (params?: unknown, options?: QueryOptions) =>
  compatQuery<any[]>(getListStockMovementsQueryKey(params), "/api/stock", options);
export const useCreateStockMovement = (options?: MutationOptions) =>
  compatMutation("POST", () => "/api/stock", options);
