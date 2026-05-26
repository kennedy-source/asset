import { sqliteTable, numeric } from "drizzle-orm/sqlite-core";

export function money(name: string) {
  // Use NUMERIC in DB, but keep runtime values as numbers.
  return numeric(name, { mode: "number" });
}
