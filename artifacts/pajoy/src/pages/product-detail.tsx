import React from "react";
import { useRoute } from "wouter";
import { useGetProduct, useGetStockMovements } from "@workspace/api-client-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Tag, Layers, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const productId = params?.id ? parseInt(params.id) : 0;

  const { data: product, isLoading: isLoadingProduct } = useGetProduct(productId, {
    query: { enabled: !!productId }
  });

  const { data: movements, isLoading: isLoadingMovements } = useGetStockMovements(productId, {
    query: { enabled: !!productId }
  });

  if (isLoadingProduct) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-48 md:col-span-1" />
          <Skeleton className="h-48 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!product) return <div>Product not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          {!product.is_active && <Badge variant="destructive">Inactive</Badge>}
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          SKU: {product.sku}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.image_url ? (
              <div className="aspect-square bg-muted rounded-md mb-4 overflow-hidden">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-md mb-4 flex items-center justify-center text-muted-foreground">
                <Package className="h-12 w-12 opacity-50" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4" /> Category</span>
                <span className="font-medium">{product.category_name || "Uncategorized"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Layers className="h-4 w-4" /> Stock</span>
                <span className="font-medium">{product.stock_quantity} {product.unit || "units"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-medium">{formatCurrency(product.cost_price || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Stock Movements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingMovements ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Qty Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements?.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{formatDateTime(movement.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 capitalize">
                          {movement.type === 'in' ? <TrendingUp className="h-4 w-4 text-green-500" /> : 
                           movement.type === 'out' ? <TrendingDown className="h-4 w-4 text-destructive" /> : 
                           <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />}
                          {movement.type}
                        </div>
                      </TableCell>
                      <TableCell>{movement.reference_type} {movement.reference_id}</TableCell>
                      <TableCell className={`text-right font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!movements || movements.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No stock movements found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
