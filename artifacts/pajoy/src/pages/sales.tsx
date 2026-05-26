// @ts-nocheck
import { useState } from "react";
import { Link } from "wouter";
import {
  useListSales,
  getListSalesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, ShoppingCart } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";

const statusColors: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PENDING: "bg-red-100 text-red-700",
};

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

export default function Sales() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;
  const params = {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    page,
    limit,
  };
  const { data, isLoading } = useListSales(params, {
    query: { queryKey: getListSalesQueryKey(params) },
  });
  const sales = data?.items ?? [];
  const total = data?.total ?? sales.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sales.length} transactions
          </p>
        </div>
        <Link href="/pos">
          <Button data-testid="button-new-sale">
            <ShoppingCart className="w-4 h-4 mr-2" />
            New Sale (POS)
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">From</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
            data-testid="input-start-date"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">To</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
            data-testid="input-end-date"
          />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Sales (this page)",
            value: fmt(sales.reduce((s, r) => s + r.total, 0)),
          },
          { label: "Transactions (this page)", value: String(sales.length) },
          {
            label: "Average Sale (this page)",
            value:
              sales.length > 0
                ? fmt(sales.reduce((s, r) => s + r.total, 0) / sales.length)
                : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p
              className="text-xl font-bold mt-1"
              data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Sale #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No sales found
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((s) => (
                  <TableRow key={s.id} data-testid={`row-sale-${s.id}`}>
                    <TableCell className="font-mono text-sm font-medium">
                      {s.saleNumber}
                    </TableCell>
                    <TableCell>
                      {(s as any).customerName || "Walk-in"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmt(s.total)}
                    </TableCell>
                    <TableCell className="text-emerald-600">
                      {fmt(s.amountPaid)}
                    </TableCell>
                    <TableCell
                      className={
                        s.balance > 0
                          ? "text-red-600 font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {fmt(s.balance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[s.paymentStatus] || ""}>
                        {s.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.createdAt!).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/sales/${s.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`button-view-${s.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
