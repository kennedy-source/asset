// @ts-nocheck
import React, { useState } from "react";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus } from "lucide-react";
import { Link } from "wouter";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading } = useListProducts({ query: searchTerm });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data?.data?.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="hover-elevate cursor-pointer transition-all">
                <CardContent className="p-4 flex flex-col items-center text-center h-full">
                  <div className="h-24 w-24 bg-muted rounded-md mb-4 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover rounded-md" />
                    ) : (
                      <span className="text-muted-foreground">No image</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">{product.sku}</p>
                  <div className="mt-auto pt-2 w-full flex justify-between items-end">
                    <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stock_quantity <= (product.low_stock_threshold || 5) 
                        ? "bg-destructive/10 text-destructive" 
                        : "bg-green-100 text-green-700"
                    }`}>
                      {product.stock_quantity} in stock
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
