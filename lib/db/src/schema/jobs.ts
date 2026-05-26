export * from "./embroidery";
export * from "./printing";

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const jobStatusHistoryTable = sqliteTable(
  "job_status_history",
  {
    id: integer("id").primaryKey(),
    jobType: text("job_type").notNull(),
    jobId: integer("job_id").notNull(),
    oldStatus: text("old_status"),
    newStatus: text("new_status").notNull(),
    notes: text("notes"),
    changedBy: integer("changed_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  },
  (t) => ({
    jobIdx: index("job_status_history_job_idx").on(t.jobType, t.jobId),
  }),
);
