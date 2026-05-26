// @ts-nocheck
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useCreateInvoice,
  useListCustomers,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { clearOcrDraft, loadOcrDraft } from "@/lib/ocr-drafts";

const schema = z.object({
  customerId: z.number().optional(),
  dueDate: z.string().optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
});

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

export default function InvoiceForm() {
  const [, setLocation] = useLocation();
  const { data } = useListCustomers();
  const customers = Array.isArray(data) ? data : (data?.items ?? []);
  const createMutation = useCreateInvoice();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState([
    { itemName: "", description: "", quantity: 1, unitPrice: 0 },
  ]);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { discount: 0, tax: 0 },
  });

  useEffect(() => {
    const draft = loadOcrDraft("invoice");
    if (!draft) return;
    setItems(
      draft.items.map((i) => ({
        itemName: i.name,
        description: `OCR source image: ${draft.imageUrl}`,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    );
    clearOcrDraft("invoice");
  }, []);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discount = form.watch("discount") || 0;
  const tax = form.watch("tax") || 0;
  const total = subtotal - discount + tax;

  const addItem = () =>
    setItems([
      ...items,
      { itemName: "", description: "", quantity: 1, unitPrice: 0 },
    ]);
  const removeItem = (i: number) =>
    setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) =>
    setItems(
      items.map((item, idx) =>
        idx === i ? { ...item, [field]: value } : item,
      ),
    );

  const onSubmit = (values: z.infer<typeof schema>) => {
    const validItems = items.filter((i) => i.itemName.trim());
    if (!validItems.length) {
      toast({ variant: "destructive", title: "Add at least one item" });
      return;
    }
    createMutation.mutate(
      { data: { ...values, items: validItems } },
      {
        onSuccess: (inv) => {
          toast({ title: "Invoice created" });
          queryClient.invalidateQueries({
            queryKey: getListInvoicesQueryKey(),
          });
          setLocation(`/invoices/${inv.id}`);
        },
        onError: () =>
          toast({ variant: "destructive", title: "Failed to create" }),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/invoices")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">New Invoice</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger data-testid="select-customer">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Items</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addItem}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          value={item.itemName}
                          onChange={(e) =>
                            updateItem(i, "itemName", e.target.value)
                          }
                          placeholder="Item name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(i, "quantity", Number(e.target.value))
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(i, "unitPrice", Number(e.target.value))
                          }
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmt(item.quantity * item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end text-sm">
                <div className="space-y-1 w-56">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-1">
                    <span>TOTAL</span>
                    <span>{fmt(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            data-testid="button-create"
          >
            {createMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
