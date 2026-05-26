// @ts-nocheck
import { useParams, useLocation } from "wouter";
import { useGetSale } from "@workspace/api-client-react";
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
import { ArrowLeft, Printer } from "lucide-react";
import { safePrint } from "@/lib/print-utils";
import { formatDateTime } from "@/lib/format";

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

const statusColors: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PENDING: "bg-red-100 text-red-700",
};

export default function SaleDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const params = useParams();
  const saleId = id ?? (params?.id ? Number(params.id) : 0);
  const { data: sale, isLoading } = useGetSale(saleId, {
    query: { enabled: !!saleId, queryKey: ["getSale", saleId] as any },
  });

  if (isLoading)
    return (
      <div className="text-center py-16 text-muted-foreground">Loading...</div>
    );
  if (!sale)
    return (
      <div className="text-center py-16 text-muted-foreground">
        Sale not found
      </div>
    );

  const items = (sale as any).items || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/sales")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Sale Receipt</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => safePrint("receipt")}
          className="ml-auto print:hidden"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      <div
        className="rounded-xl border bg-card shadow-sm p-6 print:shadow-none print:border-none"
        id="receipt"
      >
        <div className="text-center mb-6 print:mb-8">
          <h2 className="text-2xl font-bold text-primary">
            PAJOY Apparel & Branding
          </h2>
          <p className="text-muted-foreground text-sm">
            Phone: 0724941099 | Nairobi, Kenya
          </p>
          <p className="text-xs text-muted-foreground mt-1">Sales Receipt</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">Receipt No.</p>
            <p
              className="font-mono font-semibold"
              data-testid="text-sale-number"
            >
              {sale.saleNumber}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium" data-testid="text-date">
              {formatDateTime(sale.createdAt ?? sale.created_at)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium" data-testid="text-customer">
              {(sale as any).customerName || "Walk-in Customer"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Cashier</p>
            <p className="font-medium">{(sale as any).cashierName || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Method</p>
            <p className="font-medium">
              <Badge variant="secondary">{sale.paymentMethod ?? sale.payment_method}</Badge>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p>
              <Badge
                className={statusColors[String(sale.paymentStatus ?? sale.payment_status ?? "").toUpperCase()] || ""}
                data-testid="status-payment"
              >
                {String(sale.paymentStatus ?? sale.payment_status ?? "").toUpperCase()}
              </Badge>
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any, i: number) => (
              <TableRow key={i}>
                <TableCell>
                  {item.productName || `Product #${item.productId}`}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {fmt(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {fmt(item.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 space-y-2 text-sm border-t pt-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(sale.subtotal)}</span>
          </div>
          {Number(sale.discount ?? sale.discount_value ?? 0) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-{fmt(sale.discount ?? sale.discount_value)}</span>
            </div>
          )}
          {Number(sale.tax ?? sale.tax_amount ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{fmt(sale.tax ?? sale.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>TOTAL</span>
            <span data-testid="text-total">{fmt(sale.total)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Amount Paid</span>
            <span>{fmt(sale.amountPaid ?? sale.amount_paid)}</span>
          </div>
          {Number(sale.balance ?? sale.balance_due ?? 0) > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span>Balance Due</span>
              <span data-testid="text-balance">{fmt(sale.balance ?? sale.balance_due)}</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Thank you for your business!
        </p>
      </div>
    </div>
  );
}
