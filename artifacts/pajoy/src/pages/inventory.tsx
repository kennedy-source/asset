// @ts-nocheck
import { useState } from "react";
import { Link } from "wouter";
import {
  useListProducts,
  useListCategories,
  useDeleteProduct,
  useCreateProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  AlertTriangle,
  Package,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const { data: categories = [] } = useListCategories();
  const qParams = {
    ...(categoryId !== "all" ? { categoryId: Number(categoryId) } : {}),
    ...(search ? { search } : {}),
    ...(lowStock ? { lowStock: "true" } : {}),
    page,
    limit,
  };
  const { data, isLoading } = useListProducts(qParams as any, {
    query: { queryKey: getListProductsQueryKey(qParams as any) },
  });
  const products = data?.items ?? [];
  const total = data?.total ?? products.length;
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Archive product "${name}"?`)) return;
    deleteProduct.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Product archived" });
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
          });
        },
      },
    );
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) {
      toast({ variant: "destructive", title: "No data to import" });
      return;
    }

    setIsBulkImporting(true);
    const lines = bulkData.trim().split("\n");
    let successCount = 0;
    let errorCount = 0;

    for (const line of lines) {
      const parts = line.split(",").map((p: string) => p.trim());
      if (parts.length < 2) continue;

      const product = {
        name: parts[0] || "",
        sku: parts[1] || `SKU-${Date.now()}`,
        barcode: null,
        category_id: null,
        brand: null,
        description: parts[2] || null,
        price: Number(parts[3]) || 0,
        cost_price: Number(parts[4]) || 0,
        wholesale_price: null,
        stock_quantity: Number(parts[5]) || 0,
        low_stock_threshold: Number(parts[6]) || 5,
        reorder_quantity: null,
        unit: null,
        image_url: null,
        is_active: true,
        is_featured: false,
        tax_rate: null,
        supplier_id: null,
      };

      try {
        await createProduct.mutateAsync({ data: product });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsBulkImporting(false);
    setBulkOpen(false);
    setBulkData("");
    
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    
    toast({
      title: "Bulk import completed",
      description: `${successCount} products imported, ${errorCount} failed`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} products</p>
        </div>
        <div className="flex gap-2">
          <Link href="/products/new">
            <Button data-testid="button-add-product">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[160px]" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={lowStock ? "default" : "outline"}
          onClick={() => setLowStock(!lowStock)}
          data-testid="button-low-stock"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Low Stock
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No products found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const isLow = p.stockQuantity <= p.reorderLevel;
                return (
                  <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.size && (
                        <div className="text-xs text-muted-foreground">
                          {p.size} {p.color && `· ${p.color}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(p as any).categoryName || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {p.sku || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {fmt(p.sellingPrice)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={isLow ? "text-red-600 font-semibold" : ""}
                      >
                        {p.stockQuantity}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        / {p.reorderLevel}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.stockQuantity === 0 ? (
                        <Badge
                          variant="destructive"
                          data-testid={`status-product-${p.id}`}
                        >
                          Out of Stock
                        </Badge>
                      ) : isLow ? (
                        <Badge
                          className="bg-amber-100 text-amber-700 hover:bg-amber-100"
                          data-testid={`status-product-${p.id}`}
                        >
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          data-testid={`status-product-${p.id}`}
                        >
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/products/${p.id}/edit`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`button-edit-${p.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(p.id, p.name)}
                        data-testid={`button-delete-${p.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
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

      {/* Bulk Import Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Products</DialogTitle>
            <DialogDescription>
              Import multiple products at once using CSV format (Name, SKU, Description, Price, Cost, Stock, Reorder Level)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="T-Shirt, SKU-001, Cotton T-Shirt, 500, 300, 100, 10&#10;Hoodie, SKU-002, Fleece Hoodie, 1200, 800, 50, 5&#10;Polo Shirt, SKU-003, Polo Shirt, 800, 500, 75, 15"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <div className="text-sm text-muted-foreground">
              Format: Name, SKU, Description, Price, Cost, Stock, Reorder Level
            </div>
            <Button
              onClick={handleBulkImport}
              disabled={isBulkImporting}
              className="w-full"
            >
              {isBulkImporting ? "Importing..." : "Import Products"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
