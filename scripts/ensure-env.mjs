#!/usr/bin/env node
/**
 * Bootstrap .env from templates and validate required keys for Docker/local dev.
 *
 * Usage:
 *   node scripts/ensure-env.mjs         # copy missing templates
 *   node scripts/ensure-env.mjs --check # validate only (CI/setup)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const pairs = [
  [".env.example", ".env"],
  ["artifacts/api-server/.env.example", "artifacts/api-server/.env"],
  ["artifacts/pajoy/.env.example", "artifacts/pajoy/.env"],
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function bootstrap() {
  for (const [fromRel, toRel] of pairs) {
    const from = path.join(root, fromRel);
    const to = path.join(root, toRel);
    if (!fs.existsSync(from)) {
      console.warn(`[ensure-env] skip: missing template ${fromRel}`);
      continue;
    }
    if (fs.existsSync(to)) {
      console.log(`[ensure-env] ok: ${toRel} already exists`);
      continue;
    }
    if (checkOnly) {
      console.warn(`[ensure-env] missing ${toRel} (run without --check to create)`);
      continue;
    }
    fs.copyFileSync(from, to);
    console.log(`[ensure-env] created ${toRel} from ${fromRel}`);
  }
}

function validate() {
  const warnings = [];
  const errors = [];

  const apiEnvPath = path.join(root, "artifacts/api-server/.env");
  if (!fs.existsSync(apiEnvPath)) {
    errors.push("artifacts/api-server/.env is missing — run: pnpm setup:env");
  } else {
    const api = parseEnvFile(apiEnvPath);
    if (!api.JWT_SECRET?.trim()) {
      errors.push("artifacts/api-server/.env: JWT_SECRET is required");
    } else if (api.JWT_SECRET.includes("change-in-production") || api.JWT_SECRET.includes("pajoy-super-secret")) {
      warnings.push(
        "artifacts/api-server/.env: JWT_SECRET uses a template value — rotate before production",
      );
    }
    if (api.DB_PROVIDER === "postgres" && !api.DATABASE_URL?.trim()) {
      errors.push(
        "artifacts/api-server/.env: DATABASE_URL required when DB_PROVIDER=postgres",
      );
    }
  }

  for (const w of warnings) console.warn(`[ensure-env] warn: ${w}`);
  if (errors.length) {
    console.error("[ensure-env] validation FAILED");
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log("[ensure-env] validation OK");
}

if (!checkOnly) bootstrap();
validate();
