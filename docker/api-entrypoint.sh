#!/bin/sh
set -eu

log() {
  printf '[api-entrypoint] %s\n' "$*"
}

wait_for_database_url() {
  url="${DATABASE_URL:-}"
  if [ -z "$url" ] || [ "${DB_PROVIDER:-postgres}" = "sqlite" ]; then
    log "Skipping database TCP wait (sqlite or no DATABASE_URL)"
    return 0
  fi

  log "Waiting for database port from DATABASE_URL..."
  node <<'NODE'
const net = require('node:net');
const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const port = Number(url.port || 5432);
const deadline = Date.now() + Number(process.env.DB_WAIT_MS || 120_000);

function tryConnect() {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve();
    });
    socket.on('error', reject);
    socket.setTimeout(3000, () => {
      socket.destroy(new Error('timeout'));
    });
  });
}

(async () => {
  while (Date.now() < deadline) {
    try {
      await tryConnect();
      console.log('[api-entrypoint] Database port is accepting connections');
      process.exit(0);
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error('[api-entrypoint] Database not reachable in time');
  process.exit(1);
})();
NODE
}

wait_for_database_url

log "Starting API (NODE_ENV=${NODE_ENV:-unset})"
exec "$@"
