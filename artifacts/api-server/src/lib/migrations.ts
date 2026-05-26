export type MigrationsStatus = {
  initialized: boolean;
  applied: boolean;
  version?: string | null;
  pending?: number;
  lastRun?: string | null;
  lastError?: string | null;
  folder?: string | null;
};

let status: MigrationsStatus = {
  initialized: false,
  applied: false,
  version: null,
  pending: undefined,
  lastRun: null,
  lastError: null,
  folder: null,
};

export function setMigrationsStatus(partial: Partial<MigrationsStatus>) {
  status = { ...status, ...partial };
}

export function getMigrationsStatus(): MigrationsStatus {
  return status;
}

export default { setMigrationsStatus, getMigrationsStatus };
