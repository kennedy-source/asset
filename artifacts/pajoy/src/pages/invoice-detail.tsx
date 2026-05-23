import React from "react";
import { useRoute } from "wouter";
import { useGetInvoice } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer, Download, CreditCard } from "lucide-react";

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const invoiceId = params?.id ? parseInt(params.id) : 0;

  const { data: invoice, isLoading } = useGetInvoice(invoiceId, {
    query: { enabled: !!invoiceId }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "partial": return "bg-amber-100 text-amber-800";
      case "unpaid": return "bg-destructive/10 text-destructive";
      case "voided": return "bg-gray-100 text-gray-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!invoice) return <div>Invoice not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoice_number}</h1>
          <Badge className={`capitalize ${getStatusColor(invoice.payment_status)}`}>
            {invoice.payment_status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          {invoice.payment_status !== 'paid' && invoice.payment_status !== 'voided' && (
            <Button size="sm">
              <CreditCard className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-1">PAJOY Smart Business</h2>
              <p className="text-sm text-muted-foreground">Nairobi, Kenya</p>
              <p className="text-sm text-muted-foreground">+254 700 000000</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">Billed To:</div>
              <h3 className="text-lg font-bold">{invoice.customer_name}</h3>
              {invoice.customer_email && <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>}
              {invoice.customer_phone && <p className="text-sm text-muted-foreground">{invoice.customer_phone}</p>}
            </div>
          </div>
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-border/50">
            <div className="flex gap-8">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-medium">{formatDate(invoice.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(invoice.due_date)}</p>
              </div>
            </div>
            <div className="text-right bg-primary/5 p-3 rounded-lg border border-primary/10">
              <p className="text-sm text-muted-foreground">Balance Due</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(invoice.balance_due || 0)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-24">Qty</TableHead>
                <TableHead className="text-right w-32">Price</TableHead>
                <TableHead className="text-right w-32">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items?.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t border-border/50 p-6 block">
          <div className="flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {(invoice.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-{formatCurrency(invoice.discount_amount || 0)}</span>
                </div>
              )}
              {(invoice.tax_amount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (16%)</span>
                  <span>{formatCurrency(invoice.tax_amount || 0)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground pb-2">
                <span>Amount Paid</span>
                <span>{formatCurrency(invoice.amount_paid || 0)}</span>
              </div>
            </div>
          </div>
          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
