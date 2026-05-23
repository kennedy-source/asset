import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function POS() {
  const { user } = useAuth();
  
  return (
    <div className="h-screen w-full flex flex-col">
      <header className="h-14 border-b bg-card flex items-center justify-between px-4">
        <h1 className="font-bold text-lg text-primary">PAJOY POS Terminal</h1>
        <div className="text-sm font-medium">{user?.name}</div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 border-r p-4 overflow-y-auto">
          <div className="grid grid-cols-4 gap-4">
            {/* POS Product Grid placeholder */}
            {[...Array(12)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 flex flex-col items-center cursor-pointer hover:border-primary">
                <div className="h-20 w-20 bg-muted mb-2 rounded" />
                <div className="text-sm font-medium text-center">Product {i+1}</div>
                <div className="text-primary font-bold mt-1">KSh 1,500</div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-96 flex flex-col bg-muted/20">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Current Sale</h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-center text-muted-foreground text-sm mt-10">
              Cart is empty
            </div>
          </div>
          <div className="p-4 border-t bg-card space-y-4">
            <div className="flex justify-between font-bold text-xl">
              <span>Total</span>
              <span>KSh 0.00</span>
            </div>
            <Button className="w-full h-12 text-lg">Pay</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
