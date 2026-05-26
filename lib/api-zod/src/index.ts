export * from "./generated/api";
export * from "./generated/types";

import { z as zod } from "zod/v4";

export const RegisterBody = zod.any();
export const ChangePasswordBody = zod.any();
export const CreateAiScanBody = zod.any();
export const UpdateAiScanBody = zod.any();
export const ListAuditLogsQueryParams = zod.any();
export const GetSalesReportQueryParams = zod.any();
export const GetExpensesReportQueryParams = zod.any();
export const UpsertSettingBody = zod.any();
export const UpdateQuotationBody = zod.any();
export const CreatePaymentBody = zod.any();
export const CreateProductionOrderBody = zod.any();
export const UpdateProductionOrderBody = zod.any();
export const ListProductionOrdersQueryParams = zod.any();
