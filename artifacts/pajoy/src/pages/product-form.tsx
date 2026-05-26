// @ts-nocheck
import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateProduct,
  useGetProduct,
  useUpdateProduct,
  useListCategories,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.number().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  gender: z.string().optional(),
  schoolName: z.string().optional(),
  buyingPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  stockQuantity: z.number().min(0),
  reorderLevel: z.number().min(0),
  imageUrl: z.string().optional(),
  isActive: z.boolean(),
});

type ProductForm = z.infer<typeof schema>;

export default function ProductFormPage({ id }: { id?: number }) {
  const [, setLocation] = useLocation();
  const params = useParams();
  const productId = id ?? (params?.id ? Number(params.id) : undefined);
  const { data: categories = [] } = useListCategories();
  const { data: existing } = useGetProduct(productId!, {
    query: { enabled: !!productId, queryKey: ["getProduct", productId] as any },
  });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<ProductForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      buyingPrice: 0,
      sellingPrice: 0,
      stockQuantity: 0,
      reorderLevel: 5,
      isActive: true,
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        name: existing.name,
        categoryId: existing.categoryId ?? existing.category_id ?? undefined,
        sku: existing.sku ?? "",
        description: (existing as any).description ?? "",
        size: existing.size ?? "",
        color: existing.color ?? "",
        material: (existing as any).material ?? "",
        gender: existing.gender ?? "",
        schoolName: existing.schoolName ?? existing.school_name ?? "",
        buyingPrice: Number(existing.buyingPrice ?? existing.buying_price ?? existing.cost_price ?? 0),
        sellingPrice: Number(existing.sellingPrice ?? existing.selling_price ?? existing.price ?? 0),
        stockQuantity: Number(existing.stockQuantity ?? existing.stock_quantity ?? 0),
        reorderLevel: Number(existing.reorderLevel ?? existing.reorder_level ?? existing.low_stock_threshold ?? 5),
        imageUrl: (existing as any).imageUrl ?? "",
        isActive: existing.isActive ?? existing.is_active ?? true,
      });
    }
  }, [existing]);

  const onSubmit = (values: ProductForm) => {
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    
    const apiData = {
      name: values.name,
      sku: values.sku || `SKU-${Date.now()}`,
      barcode: null,
      category_id: values.categoryId || null,
      brand: null,
      description: values.description || null,
      price: values.sellingPrice,
      cost_price: values.buyingPrice,
      wholesale_price: null,
      stock_quantity: values.stockQuantity,
      low_stock_threshold: values.reorderLevel,
      reorder_quantity: null,
      unit: null,
      image_url: values.imageUrl || null,
      is_active: values.isActive,
      is_featured: false,
      tax_rate: null,
      supplier_id: null,
    };
    
    if (productId) {
      updateMutation.mutate(
        { id: productId, data: apiData },
        {
          onSuccess: () => {
            toast({ title: "Product updated" });
            setLocation("/inventory");
            invalidate();
          },
          onError: (error: any) => {
            console.error("Update error:", error);
            toast({ variant: "destructive", title: "Failed to update", description: error.message || "Unknown error" });
          },
        },
      );
    } else {
      createMutation.mutate(
        { data: apiData },
        {
          onSuccess: () => {
            toast({ title: "Product created" });
            setLocation("/inventory");
            invalidate();
          },
          onError: (error: any) => {
            console.error("Create error:", error);
            toast({ variant: "destructive", title: "Failed to create", description: error.message || "Unknown error" });
          },
        },
      );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/inventory")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {productId ? "Edit Product" : "New Product"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
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
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-sku" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <FormControl>
                      <Input placeholder="S, M, L, XL..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="White, Blue..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="unisex">Unisex</SelectItem>
                        <SelectItem value="kids">Kids</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Pricing & Stock</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="buyingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buying Price (KSh)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-buying-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (KSh)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-selling-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reorderLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 pt-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-save"
          >
            {productId ? "Update Product" : "Create Product"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
