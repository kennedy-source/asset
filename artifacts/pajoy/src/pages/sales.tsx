import React, { useState } from "react";
import { useListSales } from "@workspace/api-client-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function SalesHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading } = useListSales({ query: searchTerm });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by sale number or customer..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sale Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((sale) => (
                  <TableRow key={sale.id} className={sale.voided ? "opacity-50 line-through" : ""}>
                    <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                    <TableCell className="font-medium">{sale.sale_number}</TableCell>
                    <TableCell>{sale.customer_name || "Walk-in"}</TableCell>
                    <TableCell>{sale.cashier_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{sale.payment_method}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(sale.total)}</TableCell>
                  </TableRow>
                ))}
                {data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No sales found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
