// @ts-nocheck
import { useState } from "react";
import { useListPayments } from "@workspace/api-client-react";
import { useEffect } from "react";
import { desktopApiJson } from "@/desktop-api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import { Link } from "wouter";

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}
const statusTone: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
  REVERSED: "bg-slate-200 text-slate-700",
};

export default function Payments() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [summary, setSummary] = useState<{ cash: number; bank: number; total: number } | null>(null);
  const { data, isLoading } = useListPayments({ page, limit } as any);
  const payments = data?.items ?? [];
  const totalRecords = data?.total ?? payments.length;

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

  useEffect(() => {
    let mounted = true;
    desktopApiJson<{
      cash: number;
      bank: number;
      total: number;
    }>(`/api/payments/summary?date=${encodeURIComponent(date)}`)
      .then((result) => {
        if (!mounted) return;
        setSummary((result as any).data ?? result);
      })
      .catch(() => setSummary(null));
    return () => {
      mounted = false;
    };
  }, [date]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalRecords} payment records
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">{totalRecords} payment records</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded p-1" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Received</p>
          <p
            className="text-xl font-bold mt-1 text-emerald-600"
            data-testid="stat-total-received"
          >
            {fmt(summary?.total ?? totalReceived)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Cash Payments</p>
          <p className="text-xl font-bold mt-1" data-testid="stat-cash">
            {fmt(summary?.cash ?? payments.filter((p) => p.method === "CASH").reduce((s, p) => s + p.amount, 0))}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Bank Payments</p>
          <p className="text-xl font-bold mt-1" data-testid="stat-bank">
            {fmt(summary?.bank ?? payments.filter((p) => p.method === "BANK" || p.method === "BANK_TRANSFER").reduce((s, p) => s + p.amount, 0))}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payments recorded yet</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Verify</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                  <TableCell className="font-medium">
                    {(p as any).customerName || "—"}
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-600">
                    {fmt(p.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {p.reference || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        statusTone[p.status] || "bg-slate-100 text-slate-700"
                      }
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(p.createdAt!).toLocaleDateString()}
                  </TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4">
            <PaginationControls
              page={page}
              limit={limit}
              total={totalRecords}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
