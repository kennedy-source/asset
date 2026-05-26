// @ts-nocheck
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreatePrintingJob,
  useListCustomers,
  getListPrintingJobsQueryKey,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const PRINT_TYPES = [
  "Screen Printing",
  "Heat Press",
  "Vinyl",
  "Sublimation",
  "DTF",
  "Other",
];

const schema = z.object({
  customerId: z.number().optional(),
  printType: z.string().min(1, "Required"),
  garmentType: z.string().min(1, "Required"),
  position: z.string().optional(),
  colors: z.string().optional(),
  quantity: z.number().min(1),
  pricePerItem: z.number().min(0),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  designImageUrl: z.string().optional(),
});

export default function PrintingForm() {
  const [, setLocation] = useLocation();
  const { data } = useListCustomers();
  const customers = Array.isArray(data) ? data : (data?.items ?? []);
  const createMutation = useCreatePrintingJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, pricePerItem: 0 },
  });

  const qty = form.watch("quantity") || 0;
  const price = form.watch("pricePerItem") || 0;

  const onSubmit = (values: z.infer<typeof schema>) => {
    const apiData = {
      customer_id: values.customerId,
      design_description: values.designImageUrl,
      print_type: values.printType,
      garment_type: values.garmentType,
      print_color: values.colors,
      placement: values.position,
      quantity: values.quantity,
      unit_price: values.pricePerItem,
      total: values.quantity * values.pricePerItem,
      assigned_to: values.assignedTo ? parseInt(values.assignedTo) : null,
      due_date: values.dueDate,
      notes: values.notes,
    };
    createMutation.mutate(
      { data: apiData },
      {
        onSuccess: () => {
          toast({ title: "Printing job created" });
          queryClient.invalidateQueries({
            queryKey: getListPrintingJobsQueryKey(),
          });
          setLocation("/printing");
        },
        onError: () =>
          toast({ variant: "destructive", title: "Failed to create" }),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/printing")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">New Printing Job</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Job Details</CardTitle>
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
                name="printType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Print Type *</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger data-testid="select-print-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
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
                name="garmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garment Type *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="T-shirt, Hoodie..."
                        {...field}
                        data-testid="input-garment"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Print Position</FormLabel>
                    <FormControl>
                      <Input placeholder="Front, Back, Sleeve..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="colors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colors</FormLabel>
                    <FormControl>
                      <Input placeholder="1-color, full-color..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
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
                name="pricePerItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Item (KSh) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="col-span-2 rounded-lg bg-primary/5 p-3 border border-primary/10">
                <p className="text-sm text-muted-foreground">Total</p>
                <p
                  className="text-2xl font-bold text-primary"
                  data-testid="text-total"
                >
                  KSh {(qty * price).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={createMutation.isPending}
            data-testid="button-create"
          >
            {createMutation.isPending ? "Creating..." : "Create Printing Job"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
