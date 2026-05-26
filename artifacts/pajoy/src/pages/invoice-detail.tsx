// @ts-nocheck
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetInvoice,
  useUpdateInvoice,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { desktopApiJson } from "@/desktop-api";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Printer, DollarSign, FileText } from "lucide-react";
import { safePrint } from "@/lib/print-utils";
import { formatDate } from "@/lib/format";
import "@/styles/print.css";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

const statusColors: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  UNPAID: "bg-red-100 text-red-700",
};

// Payment details configuration
const PAYMENT_DETAILS = {
  mode: "Cooperative Bank",
  accountNumber: "To be added",
};

export default function InvoiceDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const params = useParams();
  const invoiceId = id ?? (params?.id ? Number(params.id) : 0);
  const { data: invoice, isLoading } = useGetInvoice(invoiceId, {
    query: { enabled: !!invoiceId, queryKey: ["getInvoice", invoiceId] as any },
  });
  const updateMutation = useUpdateInvoice();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  if (isLoading)
    return (
      <div className="text-center py-16 text-muted-foreground">Loading...</div>
    );
  if (!invoice)
    return (
      <div className="text-center py-16 text-muted-foreground">Not found</div>
    );

  const items = (invoice as any).items || [];

  const handlePayment = () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", title: "Enter valid amount" });
      return;
    }
    const newPaid = Number(invoice.amountPaid ?? invoice.amount_paid ?? 0) + amount;
    updateMutation.mutate(
      { id: invoiceId, data: { amountPaid: newPaid } },
      {
        onSuccess: () => {
          toast({ title: "Payment recorded" });
          setPayOpen(false);
          setPayAmount("");
          queryClient.invalidateQueries({
            queryKey: ["getInvoice", invoiceId] as any,
          });
          queryClient.invalidateQueries({
            queryKey: getListInvoicesQueryKey(),
          });
        },
      },
    );
  };

  const status = String(invoice.status ?? invoice.payment_status ?? "unpaid").toUpperCase();
  const amountPaid = Number(invoice.amountPaid ?? invoice.amount_paid ?? 0);
  const balance = Number(invoice.balance ?? invoice.balance_due ?? 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/invoices")}
          className="no-print"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Invoice</h1>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => safePrint("invoice")}
            className="print:hidden no-print"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          {status !== "PAID" && (
            <Button
              size="sm"
              onClick={() => setPayOpen(true)}
              data-testid="button-record-payment"
              className="no-print"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div id="invoice" className="rounded-xl border bg-card shadow-sm p-6 invoice-print-area">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary">
            PAJOY Apparel & Branding
          </h2>
          <p className="text-muted-foreground text-sm">
            Phone: 0724941099 | Nairobi, Kenya
          </p>
          <p className="text-xs text-muted-foreground mt-1">Invoice</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">Invoice No.</p>
            <p
              className="font-mono font-semibold"
              data-testid="text-invoice-number"
            >
              {invoice.invoiceNumber}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">
              {formatDate(invoice.createdAt ?? invoice.created_at)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium" data-testid="text-customer">
              {(invoice as any).customerName || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <Select
              value={status}
              onValueChange={async (v: string) => {
                try {
                  await desktopApiJson(`/api/invoices/${invoiceId}/payment-status`, {
                    method: "PATCH",
                    body: { status: v },
                  });
                  queryClient.invalidateQueries({ queryKey: ["getInvoice", invoiceId] as any });
                  queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
                } catch (err) {
                  toast({ variant: "destructive", title: "Failed to update status" });
                }
              }}
            >
              <SelectTrigger className="w-36" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNPAID">UNPAID</SelectItem>
                <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                <SelectItem value="PAID">PAID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {invoice.dueDate && (
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className="font-medium">
                {formatDate(invoice.dueDate ?? invoice.due_date)}
              </p>
            </div>
          )}
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
                  <div className="font-medium">{item.itemName}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">
                      {item.description}
                    </div>
                  )}
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

        <div className="mt-4 space-y-1 text-sm border-t pt-4 max-w-xs ml-auto totals-section">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(invoice.subtotal)}</span>
          </div>
          {Number(invoice.discount ?? invoice.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-{fmt(invoice.discount ?? invoice.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>TOTAL</span>
            <span data-testid="text-total">{fmt(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Amount Paid</span>
            <span>{fmt(amountPaid)}</span>
          </div>
          {balance > 0 && (
            <div className="flex justify-between text-red-600 font-bold">
              <span>Balance Due</span>
              <span data-testid="text-balance">{fmt(balance)}</span>
            </div>
          )}
        </div>

        {/* Payment Details Section */}
        <div className="payment-details-section">
          <h3 className="font-semibold text-base mb-3">Payment Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode of Payment:</span>
              <span className="font-medium">{PAYMENT_DETAILS.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Number:</span>
              <span className="font-medium">
                {PAYMENT_DETAILS.accountNumber}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="no-print">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for this invoice
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Outstanding balance:{" "}
              <span className="font-semibold text-red-600">
                {fmt(balance)}
              </span>
            </p>
            <div>
              <label className="text-sm font-medium">Amount (KSh)</label>
              <Input
                type="number"
                min="1"
                max={balance}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1"
                data-testid="input-pay-amount"
              />
            </div>
            <Button
              className="w-full"
              onClick={handlePayment}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-payment"
            >
              Confirm Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
