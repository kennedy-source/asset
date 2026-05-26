import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

export const backupJobsTable = sqliteTable(
  "backup_jobs",
  {
    id: integer("id").primaryKey(),
    targetPath: text("target_path").notNull(),
    mode: text("mode").notNull().default("MANUAL"), // MANUAL | SCHEDULED
    status: text("status").notNull().default("COMPLETED"), // COMPLETED | FAILED
    details: text("details"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("backup_jobs_created_at_idx").on(t.createdAt),
    statusIdx: index("backup_jobs_status_idx").on(t.status),
  }),
);
