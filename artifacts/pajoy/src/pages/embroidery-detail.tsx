// @ts-nocheck
import { useLocation } from "wouter";
import {
  useGetEmbroideryJob,
  useUpdateEmbroideryJob,
  getListEmbroideryJobsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

function fmt(n: number) {
  return `KSh ${(n || 0).toLocaleString()}`;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  QUALITY_CHECK: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  DELIVERED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "QUALITY_CHECK",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
];

export default function EmbroideryDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const { data: job, isLoading } = useGetEmbroideryJob(id, {
    query: { queryKey: ["getEmbroideryJob", id] as any },
  });
  const updateMutation = useUpdateEmbroideryJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading)
    return (
      <div className="text-center py-16 text-muted-foreground">Loading...</div>
    );
  if (!job)
    return (
      <div className="text-center py-16 text-muted-foreground">Not found</div>
    );

  const handleStatus = (status: string) => {
    updateMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          queryClient.invalidateQueries({
            queryKey: ["getEmbroideryJob", id] as any,
          });
          queryClient.invalidateQueries({
            queryKey: getListEmbroideryJobsQueryKey(),
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/embroidery")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Embroidery Job</h1>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-lg">{job.jobNumber}</span>
          <Badge
            className={statusColors[job.status] || ""}
            data-testid="status-job"
          >
            {job.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium" data-testid="text-customer">
              {(job as any).customerName || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Garment</p>
            <p className="font-medium">{job.garmentType}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Logo Position</p>
            <p className="font-medium">{job.logoPosition}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Thread Colors</p>
            <p className="font-medium">{job.threadColors || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Stitch Count</p>
            <p className="font-medium">
              {job.stitchCount?.toLocaleString() || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Assigned To</p>
            <p className="font-medium">{job.assignedTo || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due Date</p>
            <p className="font-medium">
              {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">
              {new Date(job.createdAt!).toLocaleDateString()}
            </p>
          </div>
          {job.logoImageUrl && (
            <div>
              <p className="text-muted-foreground">Badge</p>
              <img src={job.logoImageUrl} alt="badge" className="w-24 h-24 object-cover rounded" />
            </div>
          )}
        </div>

        <div className="rounded-lg bg-primary/5 p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Qty × Price</p>
            <p className="font-medium">
              {job.quantity} × {fmt(job.pricePerItem)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p
              className="text-2xl font-bold text-primary"
              data-testid="text-total"
            >
              {fmt(job.total)}
            </p>
          </div>
        </div>

        {job.notes && (
          <div>
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm mt-1">{job.notes}</p>
          </div>
        )}

        <div>
          <p className="text-sm font-medium mb-2">Update Status</p>
          <Select value={job.status} onValueChange={handleStatus}>
            <SelectTrigger className="w-48" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
