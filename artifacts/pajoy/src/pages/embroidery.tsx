import React from "react";

export default function Embroidery() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Embroidery Jobs</h1>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-12rem)]">
        {["Pending", "Quoted", "Confirmed", "In Progress", "Ready", "Delivered"].map(status => (
          <div key={status} className="w-80 flex-shrink-0 bg-muted/50 rounded-lg flex flex-col">
            <div className="p-3 font-semibold border-b border-border/50 text-sm">
              {status}
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto">
              <div className="bg-card p-3 rounded shadow-sm border text-sm">
                <div className="font-medium">School Logo Batch</div>
                <div className="text-muted-foreground text-xs mt-1">St. Mary's School</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
