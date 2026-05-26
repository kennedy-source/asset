// @ts-nocheck
import { useEffect, useState } from "react";
import {
  useListProductionOrders,
  useCreateProductionOrder,
  useUpdateProductionOrder,
  useListCustomers,
  getListProductionOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Factory } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import { clearOcrDraft, loadOcrDraft } from "@/lib/ocr-drafts";

const schema = z.object({
  customerId: z.number().optional(),
  type: z.string().min(1, "Required"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const validTransitions: Record<string, string[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

function getNextStatuses(currentStatus: string): string[] {
  return validTransitions[currentStatus] || [];
}

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function Production() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 50;
  const params = { ...(status !== "ALL" ? { status } : {}), page, limit };
  const { data, isLoading } = useListProductionOrders(params as any, {
    query: { queryKey: getListProductionOrdersQueryKey(params as any) },
  });
  const orders = data?.items ?? [];
  const total = data?.total ?? orders.length;
  const { data: customersData } = useListCustomers({
    page: 1,
    limit: 200,
  } as any);
  const customers = customersData?.items ?? [];
  const createMutation = useCreateProductionOrder();
  const updateMutation = useUpdateProductionOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "NORMAL" },
  });

  useEffect(() => {
    const draft = loadOcrDraft("production");
    if (!draft) return;
    const first = draft.items[0];
    if (first) {
      form.setValue("type", first.name);
      form.setValue(
        "notes",
        `OCR draft source: ${draft.imageUrl}; total items: ${draft.items.length}`,
      );
      setOpen(true);
    }
    clearOcrDraft("production");
  }, [form]);

  const onSubmit = (values: z.infer<typeof schema>) => {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Production order created" });
          setOpen(false);
          form.reset({ priority: "NORMAL" });
          queryClient.invalidateQueries({
            queryKey: getListProductionOrdersQueryKey(),
          });
        },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      },
    );
  };

  const handleStatus = (id: number, newStatus: string) => {
    updateMutation.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          queryClient.invalidateQueries({
            queryKey: getListProductionOrdersQueryKey(),
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} orders</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-new-order">
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
            (s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All Statuses" : s.replace("_", " ")}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Factory className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No production orders</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Order #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id} data-testid={`row-order-${o.id}`}>
                  <TableCell className="font-mono font-medium text-sm">
                    {o.orderNumber}
                  </TableCell>
                  <TableCell>{o.type}</TableCell>
                  <TableCell>{(o as any).customerName || "—"}</TableCell>
                  <TableCell>
                    <Badge className={priorityColors[o.priority ?? ""] || ""}>
                      {o.priority ?? "NORMAL"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[o.status] || ""}>
                      {o.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={o.status}
                      onValueChange={(v) => handleStatus(o.id, v)}
                      disabled={getNextStatuses(o.status).length === 0}
                    >
                      <SelectTrigger className="w-36 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getNextStatuses(o.status).length === 0 ? (
                          <div className="px-2 py-1 text-xs text-muted-foreground">
                            No valid transitions
                          </div>
                        ) : (
                          getNextStatuses(o.status).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace("_", " ")}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Production Order</DialogTitle>
            <DialogDescription>
              Create a new production order for manufacturing
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production Type *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Uniform, Corporate Wear..."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
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
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                Create Order
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
