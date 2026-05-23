import React from "react";
import { MobileNav } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { user } = useAuth();
  
  const initials = user?.name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "U";
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <MobileNav />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
          <Avatar className="h-9 w-9 bg-primary/10">
            <AvatarFallback className="text-primary font-medium">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
