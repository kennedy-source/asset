import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const envFile = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: false });
  console.log("[BACKEND STARTUP] env loader initialized from .env file", { envFile });
} else {
  console.log(
    "[BACKEND STARTUP] env loader skipped; .env file not found in container working directory",
    { envFile },
  );
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

if (process.env.NODE_ENV !== "production") {
  process.env.DB_PROVIDER ??= "sqlite";
  process.env.SQLITE_FILE_PATH ??= "./pajoy.db";
  process.env.PORT ??= "8080";
  process.env.CORS_ORIGIN ??= "http://localhost:5173,http://127.0.0.1:5173";
  process.env.JWT_SECRET ??= "test-secret";
}

console.log("[BACKEND STARTUP] env loader initialized", {
  envFile,
  NODE_ENV: process.env.NODE_ENV,
  DB_PROVIDER: process.env.DB_PROVIDER,
  DATABASE_URL: process.env.DATABASE_URL,
  SQLITE_FILE_PATH: process.env.SQLITE_FILE_PATH,
});
type NodeEnv = "development" | "test" | "production";
type DbProvider = "postgres" | "sqlite";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseNodeEnv(raw: string): NodeEnv {
  if (raw === "development" || raw === "test" || raw === "production")
    return raw;
  throw new Error(
    `Invalid NODE_ENV value "${raw}". Use development|test|production.`,
  );
}

function parseDbProvider(raw: string | undefined): DbProvider {
  if (raw === "sqlite") return "sqlite";
  if (raw === "postgres") return "postgres";
  return nodeEnv === "production" ? "postgres" : "sqlite";
}

function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const nodeEnv = parseNodeEnv(required("NODE_ENV"));

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

// Pesapal and M-Pesa integrations removed from this build.
// Re-add configuration and providers if these payment methods
// are required in future deployments.

/** Production requires explicit whitelist; development/test defaults to local Vite + common ports. */
const defaultDevOrigins =
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000";

const corsOriginRaw = optional("CORS_ORIGIN");

let corsOrigin: string[];
if (!corsOriginRaw) {
  if (nodeEnv === "production") {
    console.warn(
      "CORS_ORIGIN is not set in production. Allowing all origins via '*'",
    );
    corsOrigin = ["*"];
  } else {
    corsOrigin = parseOrigins(defaultDevOrigins);
  }
} else {
  corsOrigin = parseOrigins(corsOriginRaw);
}

if (corsOrigin.length === 0) {
  throw new Error("CORS_ORIGIN must include at least one allowed origin.");
}

const dbProvider = parseDbProvider(optional("DB_PROVIDER"));
const dbHost = optional("DB_HOST");
const dbUser = optional("DB_USER");
const dbPassword = optional("DB_PASSWORD");
const dbName = optional("DB_NAME");
const dbPort = optional("DB_PORT") ?? "5432";

function buildPostgresUrl(): string | null {
  if (dbHost && dbUser && dbPassword && dbName) {
    return `postgres://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${encodeURIComponent(dbName)}`;
  }
  return null;
}

const databaseUrl =
  dbProvider === "postgres"
    ? process.env.DATABASE_URL?.trim() || buildPostgresUrl() || required("DATABASE_URL")
    : (optional("DATABASE_URL") ?? `file:${optional("SQLITE_FILE_PATH") ?? "./pajoy.db"}`);

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(optional("PORT") ?? "8080"),
  jwtSecret: required("JWT_SECRET"),
  databaseUrl,
  dbProvider,
  sqliteFilePath: optional("SQLITE_FILE_PATH") ?? null,
  syncWorkerEnabled: parseBoolean(optional("SYNC_WORKER_ENABLED"), true),
  syncWorkerIntervalMs: Number(optional("SYNC_WORKER_INTERVAL_MS") ?? "10000"),
  corsOrigin,
  anthropicApiKey: optional("ANTHROPIC_API_KEY") ?? null,
  paystackSecretKey: optional("PAYSTACK_SECRET_KEY") ?? null,
  paystackWebhookSecret: optional("PAYSTACK_WEBHOOK_SECRET") ?? null,
  paystackCallbackUrl: optional("PAYSTACK_CALLBACK_URL") ?? "http://localhost:3000/payments/status",
  paystackApiUrl: optional("PAYSTACK_BASE_URL") ?? "https://api.paystack.co",
};

if (Number.isNaN(env.port) || env.port <= 0) {
  throw new Error(`Invalid PORT value "${process.env.PORT}"`);
}
if (Number.isNaN(env.syncWorkerIntervalMs) || env.syncWorkerIntervalMs < 1000) {
  throw new Error(
    `Invalid SYNC_WORKER_INTERVAL_MS value "${process.env.SYNC_WORKER_INTERVAL_MS}"`,
  );
}
