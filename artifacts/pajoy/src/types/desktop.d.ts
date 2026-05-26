declare global {
  interface Window {
    api?: {
      apiRequest: (request: {
        url: string;
        method: string;
        headers?: Record<string, string>;
        body?: string | ArrayBuffer | null;
      }) => Promise<unknown>;
      getBackendStatus?: () => Promise<{ running: boolean; port: number }>;
      getDesktopConfig?: () => Promise<{
        dbMode: "local" | "cloud";
        cloudDatabaseUrl: string;
        databaseUrl?: string;
        syncEnabled: boolean;
      }>;
      setDesktopConfig?: (config: {
        dbMode: "local" | "cloud";
        cloudDatabaseUrl: string;
        databaseUrl?: string;
        syncEnabled: boolean;
      }) => Promise<void>;
      testCloudConnection?: (
        url: string,
      ) => Promise<{ ok: boolean; status?: number; details?: string }>;
      testDatabaseUrl?: (
        url: string,
      ) => Promise<{ ok: boolean; details?: string }>;
      pickBackupFolder?: () => Promise<string | null>;
      getStartupDiagnostics?: () => Promise<unknown>;
    };
  }
}

export {};
