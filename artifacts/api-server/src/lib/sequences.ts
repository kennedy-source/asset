import { db, pool } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function nextSequence(
  key: string,
  prefix: string,
): Promise<string> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sequences (
      key text PRIMARY KEY,
      value integer NOT NULL DEFAULT 0,
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);

  const settingsRow = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);
  const current = Number.parseInt(settingsRow[0]?.value ?? "", 10);
  if (Number.isFinite(current)) {
    await pool.query(
      `INSERT INTO sequences (key, value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (key) DO NOTHING`,
      [key, current],
    );
  }

  const { rows } = await pool.query(
    `INSERT INTO sequences (key, value, updated_at)
     VALUES ($1, 1, now())
     ON CONFLICT (key)
     DO UPDATE SET value = sequences.value + 1, updated_at = now()
     RETURNING value`,
    [key],
  );
  const row = rows[0];

  const padded = String(row.value).padStart(5, "0");
  const today = new Date();
  const year = today.getFullYear().toString().slice(2);
  return `${prefix}-${year}-${padded}`;
}
