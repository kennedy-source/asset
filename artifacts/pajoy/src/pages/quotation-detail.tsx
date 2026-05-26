// @ts-nocheck
import { useLocation, useParams } from "wouter";
import {
  useGetQuotation,
  useUpdateQuotation,
  useConvertQuotationToInvoice,
  getListQuotationsQueryKey,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { safePrint } from "@/lib/print-utils";
import { formatDate } from "@/lib/format";

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

export default function QuotationDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const params = useParams();
  const quotationId = id ?? (params?.id ? Number(params.id) : 0);
  const { data: quotation, isLoading } = useGetQuotation(quotationId, {
    query: { enabled: !!quotationId, queryKey: ["getQuotation", quotationId] as any },
  });
  const updateMutation = useUpdateQuotation();
  const convertMutation = useConvertQuotationToInvoice();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading)
    return (
      <div className="text-center py-16 text-muted-foreground">Loading...</div>
    );
  if (!quotation)
    return (
      <div className="text-center py-16 text-muted-foreground">Not found</div>
    );

  const items = (quotation as any).items || [];

  const handleConvert = () => {
    if (!confirm("Convert this quotation to an invoice?")) return;
    convertMutation.mutate(
      { id: quotationId },
      {
        onSuccess: (inv) => {
          toast({
            title: "Invoice created",
            description: (inv as any).invoiceNumber,
          });
          queryClient.invalidateQueries({
            queryKey: getListQuotationsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getListInvoicesQueryKey(),
          });
          setLocation(`/invoices/${(inv as any).id}`);
        },
        onError: () =>
          toast({ variant: "destructive", title: "Failed to convert" }),
      },
    );
  };

  const handleStatus = (status: string) => {
    updateMutation.mutate(
      { id: quotationId, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          queryClient.invalidateQueries({
            queryKey: ["getQuotation", quotationId] as any,
          });
        },
      },
    );
  };

  const status = String(quotation.status ?? "draft").toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/quotations")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Quotation</h1>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => safePrint("quotation")}
            className="print:hidden"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          {status === "ACCEPTED" && (
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={convertMutation.isPending}
            >
              <FileText className="w-4 h-4 mr-2" />
              Convert to Invoice
            </Button>
          )}
        </div>
      </div>

      <div id="quotation" className="rounded-xl border bg-card shadow-sm p-6 invoice-print-area">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary">
            PAJOY Apparel & Branding
          </h2>
          <p className="text-muted-foreground text-sm">
            Phone: 0724941099 | Nairobi, Kenya
          </p>
          <p className="text-xs text-muted-foreground mt-1">Quotation</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">Quotation No.</p>
            <p
              className="font-mono font-semibold"
              data-testid="text-quotation-number"
            >
              {quotation.quotationNumber}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">
              {formatDate(quotation.createdAt ?? quotation.created_at)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium" data-testid="text-customer">
              {(quotation as any).customerName || "—"}
            </p>
          </div>
          <div className="print:hidden">
            <p className="text-muted-foreground mb-1">Status</p>
            <Select value={status} onValueChange={handleStatus}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          {quotation.validUntil && (
            <div>
              <p className="text-muted-foreground">Valid Until</p>
              <p className="font-medium">
                {formatDate(quotation.validUntil ?? quotation.valid_until)}
              </p>
            </div>
          )}
          {quotation.notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p>{quotation.notes}</p>
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
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
                <TableCell>{item.quantity}</TableCell>
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

        <div className="mt-4 space-y-1 text-sm border-t pt-4 max-w-xs ml-auto">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(quotation.subtotal)}</span>
          </div>
          {Number(quotation.discount ?? quotation.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-{fmt(quotation.discount ?? quotation.discount_amount)}</span>
            </div>
          )}
          {Number(quotation.tax ?? quotation.tax_amount ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{fmt(quotation.tax ?? quotation.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>TOTAL</span>
            <span data-testid="text-total">{fmt(quotation.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
