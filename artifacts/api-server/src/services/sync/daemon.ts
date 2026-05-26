export function getSyncDaemonStatus() {
  return { running: false };
}

export function startSyncDaemon() {
  return getSyncDaemonStatus();
}

export function stopSyncDaemon() {
  return getSyncDaemonStatus();
}
