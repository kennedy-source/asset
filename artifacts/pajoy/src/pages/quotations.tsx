// @ts-nocheck
import { Link } from "wouter";
import { useState } from "react";
import { useListQuotations } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-700",
};

export default function Quotations() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const { data, isLoading } = useListQuotations({ page, limit } as any);
  const quotations = data?.items ?? [];
  const total = data?.total ?? quotations.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {quotations.length} quotations
          </p>
        </div>
        <Link href="/quotations/new">
          <Button data-testid="button-new-quotation">
            <Plus className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No quotations yet</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Quotation #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q) => (
                <TableRow key={q.id} data-testid={`row-quotation-${q.id}`}>
                  <TableCell className="font-mono font-medium text-sm">
                    {q.quotationNumber}
                  </TableCell>
                  <TableCell>{(q as any).customerName || "—"}</TableCell>
                  <TableCell className="font-semibold">
                    {fmt(q.total)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[q.status] || ""}>
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {q.validUntil
                      ? new Date(q.validUntil).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(q.createdAt!).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link href={`/quotations/${q.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`button-view-${q.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
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
