// @ts-nocheck
import { useState } from "react";
import {
  useListStockMovements,
  useCreateStockMovement,
  useListProducts,
  getListStockMovementsQueryKey,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";

const schema = z.object({
  productId: z.number({ required_error: "Product required" }),
  type: z.enum(["IN", "OUT", "ADJUSTMENT", "RETURN"]),
  quantity: z.number().min(1),
  reason: z.string().optional(),
  reference: z.string().optional(),
});

const typeColors: Record<string, string> = {
  IN: "bg-emerald-100 text-emerald-700",
  OUT: "bg-red-100 text-red-700",
  ADJUSTMENT: "bg-blue-100 text-blue-700",
  RETURN: "bg-amber-100 text-amber-700",
};

export default function Stock() {
  const { data: movements = [], isLoading } = useListStockMovements();
  const { data: productsData } = useListProducts();
  const products = Array.isArray(productsData)
    ? productsData
    : (productsData?.items ?? []);
  const createMutation = useCreateStockMovement();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { type: "IN", quantity: 1 },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Stock movement recorded" });
          setOpen(false);
          form.reset({ type: "IN", quantity: 1 });
          queryClient.invalidateQueries({
            queryKey: getListStockMovementsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
          });
        },
        onError: () =>
          toast({ variant: "destructive", title: "Failed to record movement" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Movements</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track inventory in and out
          </p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-add-movement">
          <Plus className="w-4 h-4 mr-2" />
          Record Movement
        </Button>
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
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No stock movements recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id} data-testid={`row-movement-${m.id}`}>
                    <TableCell className="font-medium">
                      {(m as any).productName || `Product #${m.productId}`}
                    </TableCell>
                    <TableCell>
                      <Badge className={typeColors[m.type] || ""}>
                        {m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {m.type === "OUT" ? "-" : "+"}
                      {m.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.reason || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {m.reference || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.createdAt!).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
            <DialogDescription>
              Add or remove stock from inventory
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger data-testid="select-product">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Movement Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">IN (Stock In)</SelectItem>
                        <SelectItem value="OUT">OUT (Stock Out)</SelectItem>
                        <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                        <SelectItem value="RETURN">RETURN</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference No.</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
                data-testid="button-save"
              >
                Record Movement
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
