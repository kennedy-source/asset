#!/usr/bin/env node
/**
 * Verifies local Docker stack health (run after docker compose up).
 */
const endpoints = [
  { name: "API", url: process.env.API_HEALTH_URL ?? "http://127.0.0.1:8080/api/healthz" },
  { name: "Frontend", url: process.env.FRONTEND_HEALTH_URL ?? "http://127.0.0.1:3000/" },
];

async function probe(name, url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${name} returned HTTP ${res.status}`);
  return true;
}

let failed = false;
for (const { name, url } of endpoints) {
  try {
    await probe(name, url);
    console.log(`[health-check] ${name} OK (${url})`);
  } catch (err) {
    failed = true;
    console.error(`[health-check] ${name} FAILED (${url}):`, err.message);
  }
}

process.exit(failed ? 1 : 0);
