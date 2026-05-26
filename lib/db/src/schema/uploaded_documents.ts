import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./users";

export const uploadedDocumentsTable = sqliteTable(
  "uploaded_documents",
  {
    id: integer("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    fileSizeBytes: integer("file_size_bytes"),
    uploadedBy: integer("uploaded_by"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityIdx: index("uploaded_documents_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    uploadedByIdx: index("uploaded_documents_uploaded_by_idx").on(
      table.uploadedBy,
    ),
    createdAtIdx: index("uploaded_documents_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const uploadedDocumentsRelations = relations(
  uploadedDocumentsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [uploadedDocumentsTable.uploadedBy],
      references: [usersTable.id],
    }),
  }),
);
