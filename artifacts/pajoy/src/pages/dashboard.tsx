// @ts-nocheck
import {
  useGetDashboardSummary,
  useGetSalesChart,
  useGetCategorySales,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
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
  AlertTriangle,
  Scissors,
  Printer,
  FileText,
  DollarSign,
  Users,
  ShoppingCart,
} from "lucide-react";

const COLORS = [
  "#0ea5e9",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
];

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: salesChart = [] } = useGetSalesChart();
  const { data: categorySales = [] } = useGetCategorySales();

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading dashboard...
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome to PAJOY Smart Business System
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Sales Today"
          value={fmt(summary?.salesToday ?? 0)}
          icon={TrendingUp}
          color="bg-primary"
        />
        <StatCard
          title="Sales This Month"
          value={fmt(summary?.salesThisMonth ?? 0)}
          icon={ShoppingCart}
          color="bg-cyan-500"
        />
        <StatCard
          title="Inventory Value"
          value={fmt(summary?.inventoryValue ?? 0)}
          icon={Package}
          color="bg-emerald-500"
        />
        <StatCard
          title="Low Stock"
          value={String(summary?.lowStockCount ?? 0)}
          icon={AlertTriangle}
          color="bg-amber-500"
          sub="items need restock"
        />
        <StatCard
          title="Customers"
          value={String(summary?.totalCustomers ?? 0)}
          icon={Users}
          color="bg-violet-500"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Embroidery"
          value={String(summary?.pendingEmbroideryJobs ?? 0)}
          icon={Scissors}
          color="bg-orange-500"
          sub="jobs in progress"
        />
        <StatCard
          title="Pending Printing"
          value={String(summary?.pendingPrintingJobs ?? 0)}
          icon={Printer}
          color="bg-pink-500"
          sub="jobs in progress"
        />
        <StatCard
          title="Pending Invoices"
          value={String(summary?.pendingInvoices ?? 0)}
          icon={FileText}
          color="bg-red-500"
          sub="awaiting payment"
        />
        <StatCard
          title="Unpaid Balance"
          value={fmt(summary?.unpaidBalance ?? 0)}
          icon={DollarSign}
          color="bg-rose-600"
          sub="total outstanding"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Sales — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={salesChart}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Tooltip
                    formatter={(v: any) => [fmt(v), "Sales"]}
                    labelFormatter={(l) => `Date: ${l}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Sales by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categorySales.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categorySales}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {categorySales.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
