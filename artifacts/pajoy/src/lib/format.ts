import { format } from "date-fns";

export function formatCurrency(amount: number): string {
  const value = Number(amount ?? 0);
  return `KSh ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function normalizeDateValue(date: string | number | Date | undefined | null): Date | null {
  if (date == null || date === "") return null;
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date;
  if (typeof date === "number") {
    const millis = date > 100000000000 ? date : date * 1000;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const numeric = Number(date);
  if (Number.isFinite(numeric) && String(date).trim() !== "") {
    const millis = numeric > 100000000000 ? numeric : numeric * 1000;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(dateString: string | undefined | null): string {
  const parsed = normalizeDateValue(dateString);
  if (!parsed) return "-";
  return format(parsed, "dd/MM/yyyy");
}

export function formatDateTime(dateString: string | undefined | null): string {
  const parsed = normalizeDateValue(dateString);
  if (!parsed) return "-";
  return format(parsed, "dd/MM/yyyy HH:mm");
}
