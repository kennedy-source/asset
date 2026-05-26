import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

export const restoreJobsTable = sqliteTable(
  "restore_jobs",
  {
    id: integer("id").primaryKey(),
    sourceFilePath: text("source_file_path").notNull(),
    preRestoreSnapshotPath: text("pre_restore_snapshot_path"),
    status: text("status").notNull().default("PENDING"), // PENDING | IN_PROGRESS | COMPLETED | FAILED | ROLLED_BACK
    progressMessage: text("progress_message"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    statusIdx: index("restore_jobs_status_idx").on(t.status),
    createdAtIdx: index("restore_jobs_created_at_idx").on(t.createdAt),
  }),
);
