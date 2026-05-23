import React, { useState } from "react";
import { useListPrintingJobs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function Printing() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading } = useListPrintingJobs({ query: searchTerm });

  const COLUMNS = ["pending", "quoted", "confirmed", "in_progress", "quality_check", "ready", "delivered"];

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority) {
      case "urgent": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      case "normal": return "bg-blue-500 text-white";
      case "low": return "bg-gray-400 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Printing Jobs</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search jobs..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-14rem)]">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-80 h-full flex-shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-14rem)]">
          {COLUMNS.map(column => {
            const columnJobs = data?.filter(job => job.status === column) || [];
            
            return (
              <div key={column} className="w-80 flex-shrink-0 bg-muted/50 rounded-lg flex flex-col border border-border/50">
                <div className="p-3 font-semibold border-b border-border/50 text-sm flex items-center justify-between bg-muted/80 rounded-t-lg">
                  <span className="capitalize">{column.replace('_', ' ')}</span>
                  <Badge variant="secondary" className="rounded-full">{columnJobs.length}</Badge>
                </div>
                <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                  {columnJobs.map(job => (
                    <Card key={job.id} className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono font-bold text-muted-foreground">{job.job_number}</span>
                          {job.priority && (
                            <Badge className={`text-[10px] px-1 py-0 ${getPriorityColor(job.priority)}`}>
                              {job.priority}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm mb-1">{job.customer_name}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] capitalize bg-background">{job.print_type?.replace('_', ' ')}</Badge>
                          <span className="text-xs text-muted-foreground font-medium">Qty: {job.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(job.due_date)}
                          </div>
                          {job.assigned_name && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[80px]">{job.assigned_name}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {columnJobs.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed border-border/50 rounded-md">
                      No jobs
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
