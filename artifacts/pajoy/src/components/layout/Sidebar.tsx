import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  FileText, 
  FileSpreadsheet, 
  Scissors, 
  Printer, 
  ReceiptText, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "POS Terminal", href: "/pos", icon: ShoppingCart },
  { name: "Products", href: "/products", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Package }, // Reusing icon, ideally use something else like Archive
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Sales History", href: "/sales", icon: ReceiptText },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Quotations", href: "/quotations", icon: FileSpreadsheet },
  { name: "Embroidery", href: "/embroidery", icon: Scissors },
  { name: "Printing", href: "/printing", icon: Printer },
  { name: "Expenses", href: "/expenses", icon: ReceiptText },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

function NavLinks({ isMobile, closeSheet }: { isMobile?: boolean, closeSheet?: () => void }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 py-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight text-sidebar-primary">PAJOY<span className="text-sidebar-foreground font-medium ml-2 text-sm">Smart Business</span></h1>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => closeSheet?.()}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-[100dvh] fixed left-0 top-0">
      <NavLinks />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden text-foreground">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
        <NavLinks isMobile closeSheet={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
