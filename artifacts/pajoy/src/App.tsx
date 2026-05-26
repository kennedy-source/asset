// @ts-nocheck
import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import ProductForm from "@/pages/product-form";
import ProductDetail from "@/pages/product-detail";
import Customers from "@/pages/customers";
import CustomerProfile from "@/pages/customer-detail";
import Suppliers from "@/pages/suppliers";
import Inventory from "@/pages/inventory";
import Stock from "@/pages/stock";
import Payments from "@/pages/payments";
import PaymentStatus from "@/pages/payment-status";
import SalesHistory from "@/pages/sales";
import SaleDetail from "@/pages/sale-detail";
import Invoices from "@/pages/invoices";
import InvoiceForm from "@/pages/invoice-form";
import InvoiceDetail from "@/pages/invoice-detail";
import Quotations from "@/pages/quotations";
import QuotationForm from "@/pages/quotation-form";
import QuotationDetail from "@/pages/quotation-detail";
import Production from "@/pages/production";
import Embroidery from "@/pages/embroidery";
import EmbroideryForm from "@/pages/embroidery-form";
import EmbroideryDetail from "@/pages/embroidery-detail";
import Printing from "@/pages/printing";
import PrintingForm from "@/pages/printing-form";
import PrintingDetail from "@/pages/printing-detail";
import Categories from "@/pages/categories";
import Staff from "@/pages/staff";
import AuditLogs from "@/pages/audit-logs";
import AIReader from "@/pages/ai-reader";
import Expenses from "@/pages/expenses";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import POS from "@/pages/pos";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && location !== "/login" && location !== "/register") {
      setLocation("/login");
    }
    if (!isLoading && user && (location === "/login" || location === "/register")) {
      setLocation("/");
    }
  }, [isLoading, user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (location === "/register") {
      return <Register />;
    }

    return <Login />;
  }

  return (
    <Switch>
      <Route path="*">
        <AppLayout>
          <ErrorBoundary>
            <Switch>
              <Route path="/pos" component={POS} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/" component={Dashboard} />
              <Route path="/products/new" component={ProductForm} />
              <Route path="/products/:id/edit" component={ProductForm} />
              <Route path="/products/:id" component={ProductDetail} />
              <Route path="/products" component={Products} />
              <Route path="/inventory" component={Inventory} />
              <Route path="/stock" component={Stock} />
              <Route path="/categories" component={Categories} />
              <Route path="/customers/:id" component={CustomerProfile} />
              <Route path="/customers" component={Customers} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/payments" component={Payments} />
              <Route path="/payment-status/:trackingId" component={PaymentStatus} />
              <Route path="/sales/:id" component={SaleDetail} />
              <Route path="/sales" component={SalesHistory} />
              <Route path="/invoices/new" component={InvoiceForm} />
              <Route path="/invoices/:id" component={InvoiceDetail} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/quotations/new" component={QuotationForm} />
              <Route path="/quotations/:id" component={QuotationDetail} />
              <Route path="/quotations" component={Quotations} />
              <Route path="/production" component={Production} />
              <Route path="/embroidery/new" component={EmbroideryForm} />
              <Route path="/embroidery/:id" component={EmbroideryDetail} />
              <Route path="/embroidery" component={Embroidery} />
              <Route path="/printing/new" component={PrintingForm} />
              <Route path="/printing/:id" component={PrintingDetail} />
              <Route path="/printing" component={Printing} />
              <Route path="/staff" component={Staff} />
              <Route path="/ai-reader" component={AIReader} />
              <Route path="/audit-logs" component={AuditLogs} />
              <Route path="/expenses" component={Expenses} />
              <Route path="/reports" component={Reports} />
              <Route path="/settings" component={Settings} />
              <Route path="/register" component={Register} />
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
