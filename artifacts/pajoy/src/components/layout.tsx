// @ts-nocheck
import React from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { desktopApiJson } from "@/desktop-api";
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Package,
  Users,
  Building2,
  FileText,
  Scissors,
  Printer,
  Factory,
  Calculator,
  BarChart3,
  Settings,
  ShieldAlert,
  FileSearch,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getCurrentRole, getValidSessionToken } from "@/lib/auth";

type Role = "super_admin" | "admin" | "manager" | "cashier" | "production";
type NavItem = {
  name: string;
  href?: string;
  icon: any;
  roles?: Role[];
  children?: Array<{ name: string; href: string; roles?: Role[] }>;
};

const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "admin", "manager", "cashier", "production"],
  },
  {
    name: "Sales",
    icon: ShoppingCart,
    children: [
      {
        name: "POS Terminal",
        href: "/pos",
        roles: ["super_admin", "admin", "manager", "cashier"],
      },
      {
        name: "Sales History",
        href: "/sales",
        roles: ["super_admin", "admin", "manager", "cashier"],
      },
      {
        name: "Payments",
        href: "/payments",
        roles: ["super_admin", "admin", "manager", "cashier"],
      },
    ],
  },
  {
    name: "Documents",
    icon: FileText,
    children: [
      {
        name: "Quotations",
        href: "/quotations",
        roles: ["super_admin", "admin", "manager", "cashier"],
      },
      {
        name: "Invoices",
        href: "/invoices",
        roles: ["super_admin", "admin", "manager", "cashier"],
      },
    ],
  },
  {
    name: "Jobs",
    icon: Scissors,
    children: [
      {
        name: "Embroidery",
        href: "/embroidery",
        roles: ["super_admin", "admin", "manager", "production"],
      },
      {
        name: "Printing",
        href: "/printing",
        roles: ["super_admin", "admin", "manager", "production"],
      },
      {
        name: "Production",
        href: "/production",
        roles: ["super_admin", "admin", "manager", "production"],
      },
    ],
  },
  {
    name: "Inventory",
    icon: Package,
    children: [
      {
        name: "Products",
        href: "/inventory",
        roles: ["super_admin", "admin", "manager"],
      },
      {
        name: "Stock Movement",
        href: "/stock",
        roles: ["super_admin", "admin", "manager"],
      },
      {
        name: "Categories",
        href: "/categories",
        roles: ["super_admin", "admin", "manager"],
      },
    ],
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    roles: ["super_admin", "admin", "manager", "cashier", "production"],
  },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: Building2,
    roles: ["super_admin", "admin", "manager"],
  },
  {
    name: "Finance",
    icon: Calculator,
    children: [
      {
        name: "Expenses",
        href: "/expenses",
        roles: ["super_admin", "admin", "manager"],
      },
      {
        name: "Reports",
        href: "/reports",
        roles: ["super_admin", "admin", "manager"],
      },
    ],
  },
  {
    name: "AI Reader",
    href: "/ai-reader",
    icon: FileSearch,
    roles: ["super_admin", "admin", "manager", "cashier", "production"],
  },
  {
    name: "Admin",
    icon: Settings,
    children: [
      { name: "Staff", href: "/staff", roles: ["super_admin", "admin"] },
      {
        name: "Audit Logs",
        href: "/audit-logs",
        roles: ["super_admin", "admin"],
      },
      {
        name: "Settings",
        href: "/settings",
        roles: ["super_admin", "admin", "manager"],
      },
    ],
  },
];

function hasRoleAccess(role: string | null, allowed?: Role[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!role) return false;
  return allowed.includes(role as Role);
}

function NavGroup({
  item,
  currentPath,
}: {
  item: NavItem;
  currentPath: string;
}) {
  const isActive =
    item.href === currentPath ||
    item.children?.some((child) => currentPath.startsWith(child.href));
  const [isOpen, setIsOpen] = useState(isActive);

  if (!item.children) {
    return (
      <Link
        href={item.href ?? "/"}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          currentPath === item.href
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <item.icon className="w-5 h-5" />
        {item.name}
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive && !isOpen
            ? "text-primary"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon className="w-5 h-5" />
          {item.name}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {isOpen && (
        <div className="pl-10 space-y-1">
          {item.children.map((child: any) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                currentPath === child.href
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const role = (user?.role || getCurrentRole()) ?? null;

  const handleLogout = () => {
    localStorage.removeItem("pajoy_token");
    setLocation("/login");
  };

  const filteredNav = NAV_ITEMS.filter((item) =>
    hasRoleAccess(role, item.roles),
  )
    .map((item) =>
      item.children
        ? {
            ...item,
            children: item.children.filter((child) =>
              hasRoleAccess(role, child.roles),
            ),
          }
        : item,
    )
    .filter((item) => !item.children || item.children.length > 0);

  return (
    <aside
      className={`w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0 no-print ${className || ""}`}
    >
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          PAJOY
        </h1>
        <p className="text-xs text-sidebar-foreground/60 font-medium">
          Smart Business System
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredNav.map((item) => (
          <NavGroup key={item.name} item={item} currentPath={location} />
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {user?.role?.toLowerCase()}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const token = getValidSessionToken();
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [desktopBackend, setDesktopBackend] = useState<null | {
    running: boolean;
    port: number;
  }>(null);
  const [syncStatus, setSyncStatus] = useState<null | {
    pending: number;
    failed: number;
    worker?: { running: boolean; lastRunAt: string | null; intervalMs: number };
  }>(null);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!window.api?.apiRequest) return;
    void window.api
      .apiRequest({ url: "desktop:get-backend-status", method: "GET" })
      .then((value) => setDesktopBackend(value as { running: boolean; port: number }))
      .catch(() => setDesktopBackend(null));
  }, []);

  useEffect(() => {
    let active = true;
    let intervalId: NodeJS.Timeout | null = null;
    const poll = async () => {
      try {
        const token = getValidSessionToken();
        if (!token) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
        const res = await desktopApiJson<{
          pending?: number;
          failed?: number;
          worker?: { running: boolean; lastRunAt?: string | null; intervalMs?: number };
        }>("/api/sync/status", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok || res.status === 401) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
        const data = res.data ?? {};
        if (active) {
          setSyncStatus({
            pending: Number(data.pending ?? 0),
            failed: Number(data.failed ?? 0),
            worker: data.worker
              ? {
                  running: Boolean(data.worker.running),
                  lastRunAt: data.worker.lastRunAt ?? null,
                  intervalMs: Number(data.worker.intervalMs ?? 0),
                }
              : undefined,
          });
        }
      } catch {
        // non-blocking
      }
    };
    // Only start polling if we have a token
    const token = getValidSessionToken();
    if (token) {
      void poll();
      intervalId = setInterval(poll, 30_000);
    }
    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (location === "/login" || location === "/register") {
    return <main>{children}</main>;
  }
  if (!token) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar className="no-print" />
      <div className="ml-64 p-8 min-h-screen flex flex-col">
        {!online && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 no-print">
            Offline mode: changes may queue for later sync.
          </div>
        )}
        {desktopBackend && !desktopBackend.running && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 no-print">
            Desktop backend is not running.
          </div>
        )}
        {syncStatus && (syncStatus.pending > 0 || syncStatus.failed > 0) && (
          <div className="mb-3 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800 no-print">
            Sync queue: {syncStatus.pending} pending, {syncStatus.failed}{" "}
            failed.
            {syncStatus.worker && (
              <span className="ml-2">
                Worker: {syncStatus.worker.running ? "running" : "stopped"}
                {syncStatus.worker.lastRunAt
                  ? `, last run ${new Date(syncStatus.worker.lastRunAt).toLocaleTimeString()}`
                  : ""}
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
