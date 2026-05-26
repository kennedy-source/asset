// @ts-nocheck
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateEmbroideryJob,
  useListCustomers,
  getListEmbroideryJobsQueryKey,
} from "@workspace/api-client-react";
import { desktopApiJson } from "@/desktop-api";
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
import { clearOcrDraft, loadOcrDraft } from "@/lib/ocr-drafts";
import { useEffect } from "react";

const schema = z.object({
  customerId: z.number().optional(),
  garmentType: z.string().min(1, "Required"),
  logoPosition: z.string().min(1, "Required"),
  threadColors: z.string().optional(),
  stitchCount: z.number().min(0).optional(),
  quantity: z.number().min(1),
  pricePerItem: z.number().min(0),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  logoImageUrl: z.string().optional(),
});

const POSITIONS = [
  "Left Chest",
  "Right Chest",
  "Back",
  "Sleeve",
  "Cap Front",
  "Custom",
];

export default function EmbroideryForm() {
  const [, setLocation] = useLocation();
  const { data } = useListCustomers();
  const customers = Array.isArray(data) ? data : (data?.items ?? []);
  const createMutation = useCreateEmbroideryJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, pricePerItem: 0, stitchCount: 0 },
  });

  useEffect(() => {
    const draft = loadOcrDraft("embroidery");
    if (!draft) return;
    const first = draft.items[0];
    if (first) {
      form.setValue("garmentType", first.name);
      form.setValue("quantity", first.quantity);
      form.setValue("pricePerItem", first.unitPrice);
      form.setValue("notes", `OCR draft source: ${draft.imageUrl}`);
    }
    clearOcrDraft("embroidery");
  }, [form]);

  const qty = form.watch("quantity") || 0;
  const price = form.watch("pricePerItem") || 0;

  const onSubmit = (values: z.infer<typeof schema>) => {
    const apiData = {
      customer_id: values.customerId,
      garment_type: values.garmentType,
      placement: values.logoPosition,
      thread_colors: values.threadColors,
      quantity: values.quantity,
      unit_price: values.pricePerItem,
      total: values.quantity * values.pricePerItem,
      assigned_to: values.assignedTo ? parseInt(values.assignedTo) : null,
      due_date: values.dueDate,
      notes: values.notes,
      logo_image_url: values.logoImageUrl,
    };
    createMutation.mutate(
      { data: apiData },
      {
        onSuccess: () => {
          toast({ title: "Embroidery job created" });
          queryClient.invalidateQueries({
            queryKey: getListEmbroideryJobsQueryKey(),
          });
          setLocation("/embroidery");
        },
        onError: (error: any) => {
          console.error("Create error:", error);
          toast({
            variant: "destructive",
            title: "Failed to create",
            description: error.message || "Could not create embroidery job",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/embroidery")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">New Embroidery Job</h1>
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
                name="garmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garment Type *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="T-shirt, Polo, Cap..."
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
                name="logoPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo Position *</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger data-testid="select-position">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
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
                name="threadColors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thread Colors</FormLabel>
                    <FormControl>
                      <Input placeholder="Red, White, Blue..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stitchCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stitch Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
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
                      <Input placeholder="Staff name..." {...field} />
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
              <FormField
                control={form.control}
                name="logoImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          // Check file size (max 5MB)
                          const maxSize = 5 * 1024 * 1024;
                          if (f.size > maxSize) {
                            toast({
                              variant: "destructive",
                              title: "File too large",
                              description: "Please select an image smaller than 5MB",
                            });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const result = String(reader.result || "");
                            try {
                              const res = await desktopApiJson<{ path: string }>(
                                "/api/uploads/embroidery-badge",
                                {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: { filename: f.name, data: result },
                                },
                              );
                              if (!res.ok) throw new Error("Upload failed");
                              form.setValue("logoImageUrl", res.data.path);
                              toast({ title: "Image uploaded successfully" });
                            } catch (err) {
                              console.error("Upload error:", err);
                              toast({
                                variant: "destructive",
                                title: "Upload failed",
                                description: "Could not upload image. Please try again.",
                              });
                            }
                          };
                          reader.readAsDataURL(f);
                        }}
                      />
                    </div>
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
            {createMutation.isPending ? "Creating..." : "Create Embroidery Job"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
