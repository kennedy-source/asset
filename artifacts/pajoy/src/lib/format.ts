import { format } from "date-fns";

export function formatCurrency(amount: number): string {
  return `KSh ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy");
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  } catch (e) {
    return dateString;
  }
}
