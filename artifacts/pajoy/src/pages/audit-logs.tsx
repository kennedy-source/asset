// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import { formatDateTime } from "@/lib/format";

/* ================= TYPES ================= */

interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
}

interface AuditLogsResponse {
  items: AuditLog[];
  total: number;
}

/* ================= API HOOK ================= */

function useListAuditLogs(page: number, limit: number) {
  return useQuery<AuditLogsResponse>({
    queryKey: ["audit-logs", page, limit],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;
      const token = localStorage.getItem("pajoy_token");
      const res = await fetch(`${apiUrl}/api/audit-logs?page=${page}&limit=${limit}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    staleTime: 60_000,
  });
}

/* ================= UI ================= */

const actionColors: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
  STOCK_MOVEMENT: "bg-purple-100 text-purple-700",
  CREATE_SALE: "bg-emerald-100 text-emerald-700",
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useListAuditLogs(page, limit);

  const logs = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete record of all system actions
        </p>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No audit logs yet</p>
          <p className="text-sm">
            Actions will appear here as they are performed
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                    <TableCell className="font-medium">
                      {log.userName || `User #${log.userId}`}
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={
                          actionColors[log.action] ||
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {log.entity}
                    </TableCell>

                    <TableCell className="font-mono text-sm">
                      {log.entityId || "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {log.ipAddress || "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(log.createdAt ?? (log as any).created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="px-4 py-3">
              <PaginationControls
                page={page}
                limit={limit}
                total={total}
                onPageChange={setPage}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
