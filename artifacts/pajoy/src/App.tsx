import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Customers from "@/pages/customers";
import CustomerProfile from "@/pages/customer-detail";
import Suppliers from "@/pages/suppliers";
import Inventory from "@/pages/inventory";
import SalesHistory from "@/pages/sales";
import Invoices from "@/pages/invoices";
import InvoiceDetail from "@/pages/invoice-detail";
import Quotations from "@/pages/quotations";
import Embroidery from "@/pages/embroidery";
import Printing from "@/pages/printing";
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
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/pos">
        <AuthGuard>
          <POS />
        </AuthGuard>
      </Route>

      <Route path="/:rest*">
        <AuthGuard>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/products" component={Products} />
              <Route path="/products/:id" component={ProductDetail} />
              <Route path="/customers" component={Customers} />
              <Route path="/customers/:id" component={CustomerProfile} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/inventory" component={Inventory} />
              <Route path="/sales" component={SalesHistory} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/invoices/:id" component={InvoiceDetail} />
              <Route path="/quotations" component={Quotations} />
              <Route path="/embroidery" component={Embroidery} />
              <Route path="/printing" component={Printing} />
              <Route path="/expenses" component={Expenses} />
              <Route path="/reports" component={Reports} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
