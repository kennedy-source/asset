// @ts-nocheck
import { useState, useEffect } from "react";
import {
  useListCategories,
  useListCustomers,
  useGetSalesReport,
  useGetInventoryReport,
  useGetBestSellers,
  useGetExpensesReport,
  getGetSalesReportQueryKey,
  getGetExpensesReportQueryKey,
} from "@workspace/api-client-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Package,
  Trophy,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

const COLORS = [
  "#0ea5e9",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
];

type ReportTab = "sales" | "inventory" | "best-sellers" | "expenses";

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [customerId, setCustomerId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<string>("summary");
  const { data: categoriesData } = useListCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : ((categoriesData as any)?.items ?? []);
  const { data: customersData } = useListCustomers();
  const customers = Array.isArray(customersData) ? customersData : ((customersData as any)?.items ?? []);
  const salesParams = {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
  if (paymentMethod && paymentMethod !== "all") (salesParams as any).paymentMethod = paymentMethod;
  if (categoryId && categoryId !== "all") (salesParams as any).categoryId = Number(categoryId);
  if (customerId && customerId !== "all") (salesParams as any).customerId = Number(customerId);
  if (viewMode) (salesParams as any).viewMode = viewMode;
  const { data: salesReport } = useGetSalesReport(salesParams, {
    query: { queryKey: getGetSalesReportQueryKey(salesParams) },
  });
  const { data: inventoryReport } = useGetInventoryReport();
  const { data: bestSellers = [] } = useGetBestSellers();
  const expParams = {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
  const { data: expensesReport } = useGetExpensesReport(expParams, {
    query: { queryKey: getGetExpensesReportQueryKey(expParams) },
  });

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: "sales", label: "Sales", icon: TrendingUp },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "best-sellers", label: "Best Sellers", icon: Trophy },
    { id: "expenses", label: "Expenses", icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Business analytics and insights
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={tab === id ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(id)}
            data-testid={`tab-${id}`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {(tab === "sales" || tab === "expenses") && (
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Payment</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                
                <SelectItem value="BANK">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Category</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Customer</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">View</label>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">From</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">To</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {tab === "sales" && salesReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p
                className="text-2xl font-bold mt-1"
                data-testid="stat-total-sales"
              >
                {fmt((salesReport as any).totalSales)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p
                className="text-2xl font-bold mt-1"
                data-testid="stat-transactions"
              >
                {(salesReport as any).totalTransactions}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Average Sale</p>
              <p className="text-2xl font-bold mt-1" data-testid="stat-avg">
                {fmt((salesReport as any).averageSale)}
              </p>
            </div>
          </div>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Sales Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {(salesReport as any).data?.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={(salesReport as any).data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v?.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(v: any) => [fmt(v), "Sales"]} />
                    <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "inventory" && inventoryReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold mt-1">
                {(inventoryReport as any).totalProducts}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold mt-1">
                {fmt((inventoryReport as any).totalValue)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-bold mt-1 text-red-600">
                {(inventoryReport as any).outOfStockCount}
              </p>
            </div>
          </div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              {(inventoryReport as any).lowStockItems?.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  All products are well-stocked
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Product</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inventoryReport as any).lowStockItems?.map((p: any) => (
                      <TableRow key={p.id} data-testid={`row-low-${p.id}`}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              p.stockQuantity === 0
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }
                          >
                            {p.stockQuantity}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.reorderLevel}</TableCell>
                        <TableCell>{fmt(p.sellingPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "best-sellers" && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Top 20 Best-Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestSellers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No sales data yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bestSellers.map((p: any, i: number) => (
                    <TableRow
                      key={p.productId}
                      data-testid={`row-best-${p.productId}`}
                    >
                      <TableCell className="font-bold text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.productName}
                      </TableCell>
                      <TableCell>{p.totalQuantity?.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {fmt(p.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "expenses" && expensesReport && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p
              className="text-2xl font-bold mt-1 text-red-600"
              data-testid="stat-total-expenses"
            >
              {fmt((expensesReport as any).totalExpenses)}
            </p>
          </div>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {(expensesReport as any).byCategory?.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No expenses recorded
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={(expensesReport as any).byCategory}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {(expensesReport as any).byCategory?.map(
                          (_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ),
                        )}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(expensesReport as any).byCategory?.map(
                        (r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {r.category}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-semibold">
                              {fmt(r.total)}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
