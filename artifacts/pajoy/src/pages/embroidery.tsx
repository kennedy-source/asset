// @ts-nocheck
import { Link } from "wouter";
import { useState } from "react";
import {
  useListEmbroideryJobs,
  getListEmbroideryJobsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, Scissors } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";

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
  "ALL",
  "PENDING",
  "IN_PROGRESS",
  "QUALITY_CHECK",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
];

export default function Embroidery() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 50;
  const params = { ...(status !== "ALL" ? { status } : {}), page, limit };
  const { data, isLoading } = useListEmbroideryJobs(params as any, {
    query: { queryKey: getListEmbroideryJobsQueryKey(params as any) },
  });
  const jobs = data?.items ?? [];
  const total = data?.total ?? jobs.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Embroidery Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} jobs</p>
        </div>
        <Link href="/embroidery/new">
          <Button data-testid="button-new-job">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </Link>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44" data-testid="select-status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "ALL" ? "All Statuses" : s.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Scissors className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No embroidery jobs found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Job #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Garment</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                  <TableCell className="font-mono font-medium text-sm">
                    {job.jobNumber}
                  </TableCell>
                  <TableCell>{(job as any).customerName || "—"}</TableCell>
                  <TableCell>{job.garmentType}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.logoPosition}
                  </TableCell>
                  <TableCell>{job.quantity}</TableCell>
                  <TableCell className="font-semibold">
                    {fmt(job.total)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[job.status] || ""}
                      data-testid={`status-job-${job.id}`}
                    >
                      {job.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {job.dueDate
                      ? new Date(job.dueDate).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/embroidery/${job.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`button-view-${job.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4">
            <PaginationControls
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
