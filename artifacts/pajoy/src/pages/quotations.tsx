import React, { useState } from "react";
import { useListQuotations } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";

export default function Quotations() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading } = useListQuotations({ query: searchTerm });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-100 text-green-800 hover:bg-green-100";
      case "sent": return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "draft": return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "rejected": return "bg-destructive/10 text-destructive hover:bg-destructive/10";
      case "expired": return "bg-orange-100 text-orange-800 hover:bg-orange-100";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Quotation
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search quotations..." 
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
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quotation_number}</TableCell>
                    <TableCell>{formatDate(quote.created_at)}</TableCell>
                    <TableCell>{quote.customer_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`capitalize ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(quote.total)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.data || data.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No quotations found
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
