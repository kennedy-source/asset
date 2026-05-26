import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

let intervalId: NodeJS.Timeout | null = null;

export function startTransactionsReaper() {
  if (intervalId) return;
  intervalId = setInterval(async () => {
    try {
      if (!pool) {
        logger.warn("Transactions reaper cannot run without a database pool");
        return;
      }
      const res = await pool.query(
        "UPDATE transactions SET status = $1 WHERE status = $2 AND updated_at < NOW() - INTERVAL '10 minutes' RETURNING reference",
        ["FAILED", "PROCESSING"],
      );
      const rowCount = res.rowCount ?? 0;
      if (rowCount > 0) {
        logger.warn({ count: rowCount }, "Marked stale PROCESSING transactions as FAILED");
      }
    } catch (err) {
      logger.warn({ err }, "Transactions reaper errored");
    }
  }, 60 * 1000);
  logger.info("Transactions reaper started");
}

export function stopTransactionsReaper() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
  logger.info("Transactions reaper stopped");
}

export default { startTransactionsReaper, stopTransactionsReaper };
