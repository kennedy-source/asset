// @ts-nocheck
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateQuotation,
  useListCustomers,
  getListQuotationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FormMessage,
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

const itemSchema = z.object({
  itemName: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
});
const schema = z.object({
  customerId: z.number().optional(),
  validUntil: z.string().optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  notes: z.string().optional(),
});

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

export default function QuotationForm() {
  const [, setLocation] = useLocation();
  const { data } = useListCustomers();
  const customers = Array.isArray(data) ? data : (data?.items ?? []);
  const createMutation = useCreateQuotation();
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
    const draft = loadOcrDraft("quotation");
    if (!draft) return;
    setItems(
      draft.items.map((i) => ({
        itemName: i.name,
        description: `OCR source image: ${draft.imageUrl}`,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    );
    form.setValue(
      "notes",
      `Generated from OCR (${Math.round((draft.confidence ?? 0) * 100)}% confidence)`,
    );
    clearOcrDraft("quotation");
  }, [form]);

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
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "Add at least one item" });
      return;
    }
    createMutation.mutate(
      { data: { ...values, items: validItems } },
      {
        onSuccess: () => {
          toast({ title: "Quotation created" });
          queryClient.invalidateQueries({
            queryKey: getListQuotationsQueryKey(),
          });
          setLocation("/quotations");
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
          onClick={() => setLocation("/quotations")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">New Quotation</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Customer Details</CardTitle>
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
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
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
                    <TableHead>Description</TableHead>
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
                          className="min-w-[140px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(i, "description", e.target.value)
                          }
                          placeholder="Description"
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

              <div className="mt-4 flex justify-end gap-8 text-sm">
                <div className="space-y-2 w-64">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Discount</span>
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          className="w-28 h-7"
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Tax</span>
                    <FormField
                      control={form.control}
                      name="tax"
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          className="w-28 h-7"
                        />
                      )}
                    />
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>TOTAL</span>
                    <span data-testid="text-total">{fmt(total)}</span>
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
            {createMutation.isPending ? "Creating..." : "Create Quotation"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
