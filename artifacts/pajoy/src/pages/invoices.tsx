// @ts-nocheck
import { Link } from "wouter";
import { useState } from "react";
import { useListInvoices } from "@workspace/api-client-react";
import { desktopApiJson } from "@/desktop-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, FileText } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import { formatDate } from "@/lib/format";

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

const statusColors: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  UNPAID: "bg-red-100 text-red-700",
  OVERDUE: "bg-red-200 text-red-800",
};

export default function Invoices() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const { data, isLoading } = useListInvoices({ page, limit } as any);
  const invoices = data?.items ?? [];
  const total = data?.total ?? invoices.length;
  const unpaidTotal = invoices
    .filter((i) => String(i.status ?? i.payment_status ?? "").toUpperCase() !== "PAID")
    .reduce((s, i) => s + Number(i.balance ?? i.balance_due ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {invoices.length} invoices
          </p>
        </div>
        <Link href="/invoices/new">
          <Button data-testid="button-new-invoice">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Invoiced</p>
          <p className="text-xl font-bold mt-1" data-testid="stat-total">
            {fmt(invoices.reduce((s, i) => s + Number(i.total ?? 0), 0))}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Outstanding Balance</p>
          <p
            className="text-xl font-bold mt-1 text-red-600"
            data-testid="stat-unpaid"
          >
            {fmt(unpaidTotal)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Paid Invoices</p>
          <p
            className="text-xl font-bold mt-1 text-emerald-600"
            data-testid="stat-paid"
          >
            {invoices.filter((i) => String(i.status ?? i.payment_status ?? "").toUpperCase() === "PAID").length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No invoices yet</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const status = String(inv.status ?? inv.payment_status ?? "unpaid").toUpperCase();
                const amountPaid = Number(inv.amountPaid ?? inv.amount_paid ?? 0);
                const balance = Number(inv.balance ?? inv.balance_due ?? 0);
                return (
                <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                  <TableCell className="font-mono font-medium text-sm">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell>{(inv as any).customerName || "—"}</TableCell>
                  <TableCell className="font-semibold">
                    {fmt(inv.total)}
                  </TableCell>
                  <TableCell className="text-emerald-600">
                    {fmt(amountPaid)}
                  </TableCell>
                  <TableCell
                    className={
                      balance > 0
                        ? "text-red-600 font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {fmt(balance)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={status}
                      onValueChange={async (v: string) => {
                        try {
                          await desktopApiJson(`/api/invoices/${inv.id}/payment-status`, {
                            method: "PATCH",
                            body: { status: v },
                          });
                          // refresh list
                          window.location.reload();
                        } catch (err) {
                          alert("Failed to update status");
                        }
                      }}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNPAID">UNPAID</SelectItem>
                        <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                        <SelectItem value="PAID">PAID</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
          <div className="px-4">
            <PaginationControls
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
