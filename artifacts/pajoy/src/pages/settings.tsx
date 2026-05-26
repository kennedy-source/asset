// @ts-nocheck
import { useState, useEffect } from "react";
import {
  useListSettings,
  useUpsertSetting,
  getListSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { desktopApiJson } from "@/desktop-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings as SettingsIcon } from "lucide-react";

const COMPANY_SETTINGS = [
  {
    key: "company_name",
    label: "Company Name",
    placeholder: "PAJOY Apparel & Branding",
  },
  { key: "company_phone", label: "Phone Number", placeholder: "0724941099" },
  {
    key: "company_email",
    label: "Email Address",
    placeholder: "info@pajoy.co.ke",
  },
  {
    key: "company_address",
    label: "Physical Address",
    placeholder: "Nairobi, Kenya",
  },
  { key: "company_pin", label: "KRA PIN", placeholder: "P00000000A" },
  {
    key: "invoice_footer",
    label: "Invoice Footer Note",
    placeholder: "Thank you for your business!",
  },
  { key: "tax_rate", label: "Tax Rate (%)", placeholder: "16" },
  { key: "currency", label: "Currency", placeholder: "KSh" },
];

export default function Settings() {
  const { data: settings = [], isLoading } = useListSettings();
  const upsertMutation = useUpsertSetting();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [syncOpsBusy, setSyncOpsBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [backupMessage, setBackupMessage] = useState<string>("");
  const [restoreFilePath, setRestoreFilePath] = useState("");
  const [restoreValidation, setRestoreValidation] = useState<string>("");
  const [restoreExecMessage, setRestoreExecMessage] = useState<string>("");
  const [desktopConfig, setDesktopConfig] = useState<{
    dbMode: "local" | "cloud";
    cloudDatabaseUrl: string;
    syncEnabled: boolean;
  }>({ dbMode: "local", cloudDatabaseUrl: "", syncEnabled: false });
  const [desktopConfigLoaded, setDesktopConfigLoaded] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string>("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [startupDiagnostics, setStartupDiagnostics] = useState<any>(null);

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {};
      settings.forEach((s) => {
        map[s.key] = s.value;
      });
      setValues(map);
    }
  }, [settings]);

  useEffect(() => {
    if (!window.api?.apiRequest) return;
    void window.api
      .apiRequest({ url: "desktop:get-startup-diagnostics", method: "GET" })
      .then(setStartupDiagnostics)
      .catch(() => setStartupDiagnostics(null));
  }, []);

  useEffect(() => {
    if (!window.api?.apiRequest) {
      setDesktopConfigLoaded(true);
      return;
    }

    void window.api
      .apiRequest({ url: "desktop:get-desktop-config", method: "GET" })
      .then((config) => {
        setDesktopConfig(config as typeof desktopConfig);
        setDesktopConfigLoaded(true);
      })
      .catch(() => setDesktopConfigLoaded(true));
  }, []);

  const withAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("pajoy_token");
    return token ? { authorization: `Bearer ${token}` } : {};
  };

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => new Set(prev).add(key));
  };

  const handleDesktopConfigChange = (
    field: keyof typeof desktopConfig,
    value: string | boolean,
  ) => {
    setDesktopConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveDesktopConfig = async () => {
    if (!window.api?.apiRequest) {
      setCloudStatus("Desktop config API unavailable");
      return;
    }
    setCloudBusy(true);
    try {
      await window.api.apiRequest({
        url: "desktop:set-desktop-config",
        method: "POST",
        body: JSON.stringify(desktopConfig),
      });
      setCloudStatus("Cloud sync settings saved");
    } catch (error) {
      setCloudStatus(
        error instanceof Error ? error.message : "Failed to save cloud settings",
      );
    } finally {
      setCloudBusy(false);
    }
  };

  const testCloudConnection = async () => {
    if (!window.api?.apiRequest) {
      setCloudStatus("Desktop connection API unavailable");
      return;
    }
    if (!desktopConfig.cloudDatabaseUrl.trim()) {
      setCloudStatus("Enter a cloud database URL before testing");
      return;
    }
    setCloudBusy(true);
    try {
      const result = (await window.api.apiRequest({
        url: "desktop:test-cloud-connection",
        method: "POST",
        body: desktopConfig.cloudDatabaseUrl,
      })) as { ok: boolean; status?: number; details?: string };
      setCloudStatus(
        result.ok
          ? `Connection succeeded (${result.details ?? "OK"})`
          : `Connection failed (${result.status ?? "unknown"})`,
      );
    } catch (error) {
      setCloudStatus(
        error instanceof Error ? error.message : "Cloud connection test failed",
      );
    } finally {
      setCloudBusy(false);
    }
  };

  const syncNow = async () => {
    setCloudBusy(true);
    try {
      const res = await desktopApiJson<{ processed?: number; failed?: number }>(
        "/api/sync/process",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...withAuthHeaders() },
          body: { limit: 50 },
        },
      );
      if (res.status === 401) {
        setCloudStatus("Authentication failed. Please log in again.");
        return;
      }
      const data = res.data;
      setCloudStatus(
        `Sync processed ${data.processed ?? 0}, failed ${data.failed ?? 0}`,
      );
    } catch (error: any) {
      console.error("Sync error:", error);
      setCloudStatus("Sync now failed");
    } finally {
      setCloudBusy(false);
    }
  };

  const handleSave = async (key: string) => {
    upsertMutation.mutate(
      { data: { key, value: values[key] || "" } },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: `${key} updated` });
          setDirty((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          queryClient.invalidateQueries({
            queryKey: getListSettingsQueryKey(),
          });
        },
        onError: () =>
          toast({ variant: "destructive", title: "Failed to save" }),
      },
    );
  };

  const handleSaveAll = async () => {
    const keys = Array.from(dirty);
    for (const key of keys) {
      await upsertMutation.mutateAsync({
        data: { key, value: values[key] || "" },
      });
    }
    toast({ title: "All settings saved" });
    setDirty(new Set());
    queryClient.invalidateQueries({ queryKey: getListSettingsQueryKey() });
  };

  const processSync = async () => {
    setSyncOpsBusy(true);
    try {
      const res = await desktopApiJson<{ processed?: number; failed?: number }>(
        "/api/sync/process",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...withAuthHeaders() },
          body: { limit: 50 },
        },
      );
      const data = res.data;
      setSyncMessage(
        `Processed ${data.processed ?? 0}, failed ${data.failed ?? 0}`,
      );
    } catch {
      setSyncMessage("Sync processing failed");
    } finally {
      setSyncOpsBusy(false);
    }
  };

  const retryFailedSync = async () => {
    setSyncOpsBusy(true);
    try {
      const res = await desktopApiJson<{ queuedForRetry?: number }>(
        "/api/sync/retry-failed",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...withAuthHeaders() },
          body: { limit: 50 },
        },
      );
      if (res.status === 401) {
        setSyncMessage("Authentication failed. Please log in again.");
        return;
      }
      const data = res.data;
      setSyncMessage(
        `Queued ${data.queuedForRetry ?? 0} failed mutations for retry`,
      );
    } catch (error: any) {
      console.error("Retry sync error:", error);
      setSyncMessage("Retry failed");
    } finally {
      setSyncOpsBusy(false);
    }
  };

  const exportBackup = async () => {
    try {
      if (!window.api?.apiRequest) {
        throw new Error("Desktop API unavailable");
      }
      const folder = (await window.api.apiRequest({
        url: "desktop:pick-backup-folder",
        method: "GET",
      })) as string | null;
      if (!folder) return;
      const res = await desktopApiJson<{ error?: { message?: string } }>(
        "/api/backup/export",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...withAuthHeaders() },
          body: { targetDir: folder },
        },
      );
      if (!res.ok) throw new Error(res.data?.error?.message ?? "Backup failed");
      setBackupMessage("Backup export completed");
    } catch (error) {
      setBackupMessage(
        error instanceof Error ? error.message : "Backup failed",
      );
    }
  };

  const validateRestore = async () => {
    if (!restoreFilePath.trim()) return;
    try {
      const res = await desktopApiJson<{ compatible?: boolean; dbProvider?: string; error?: { message?: string } }>(
        "/api/backup/restore/validate",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...withAuthHeaders() },
          body: { filePath: restoreFilePath },
        },
      );
      if (!res.ok)
        throw new Error(res.data?.error?.message ?? "Restore validation failed");
      const data = res.data;
      setRestoreValidation(
        `Compatible: ${String(data.compatible)} (${data.dbProvider})`,
      );
    } catch (error) {
      setRestoreValidation(
        error instanceof Error ? error.message : "Restore validation failed",
      );
    }
  };

  const executeRestore = async () => {
    if (!restoreFilePath.trim()) return;
    const confirmed = window.confirm(
      "Restore will overwrite current local database. A pre-restore snapshot will be created. Continue?",
    );
    if (!confirmed) return;
    try {
      const res = await desktopApiJson<{ status?: string; restoreJobId?: string; error?: { message?: string } }>(
        "/api/backup/restore/start",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...withAuthHeaders() },
          body: {
            filePath: restoreFilePath,
            confirm: "RESTORE_NOW",
          },
        },
      );
      if (!res.ok) throw new Error(res.data?.error?.message ?? "Restore failed");
      const data = res.data;
      setRestoreExecMessage(
        `Restore status: ${data.status ?? "accepted"} (job ${data.restoreJobId ?? "-"})`,
      );
    } catch (error) {
      setRestoreExecMessage(
        error instanceof Error ? error.message : "Restore failed",
      );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your business profile and preferences
          </p>
        </div>
        {dirty.size > 0 && (
          <Button
            onClick={handleSaveAll}
            disabled={upsertMutation.isPending}
            data-testid="button-save-all"
          >
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading...
        </div>
      ) : (
        <>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Company Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {COMPANY_SETTINGS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-foreground">
                      {label}
                    </label>
                    <Input
                      className="mt-1"
                      value={values[key] || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      data-testid={`input-${key}`}
                    />
                  </div>
                  {dirty.has(key) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(key)}
                      className="mt-6 shrink-0"
                      disabled={upsertMutation.isPending}
                      data-testid={`button-save-${key}`}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Cloud Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Use Cloud Database</p>
                  <p className="text-xs text-muted-foreground">
                    Switch between local SQLite and cloud Postgres for the desktop
                    backend.
                  </p>
                </div>
                <Switch
                  checked={desktopConfig.dbMode === "cloud"}
                  onCheckedChange={(value) =>
                    handleDesktopConfigChange(
                      "dbMode",
                      value ? "cloud" : "local",
                    )
                  }
                  disabled={!window.api?.apiRequest || !desktopConfigLoaded}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cloud Database URL</label>
                <Input
                  value={desktopConfig.cloudDatabaseUrl}
                  onChange={(e) =>
                    handleDesktopConfigChange("cloudDatabaseUrl", e.target.value)
                  }
                  placeholder="postgresql://..."
                  disabled={!window.api?.apiRequest || !desktopConfigLoaded}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Auto-sync to cloud</p>
                  <p className="text-xs text-muted-foreground">
                    Enable background sync for cloud database updates.
                  </p>
                </div>
                <Switch
                  checked={desktopConfig.syncEnabled}
                  onCheckedChange={(value) =>
                    handleDesktopConfigChange("syncEnabled", value)
                  }
                  disabled={!window.api?.apiRequest || !desktopConfigLoaded}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={testCloudConnection}
                  disabled={cloudBusy || !window.api?.apiRequest || !desktopConfigLoaded}
                >
                  Test Connection
                </Button>
                <Button
                  variant="outline"
                  onClick={syncNow}
                  disabled={cloudBusy || !window.api?.apiRequest || !desktopConfigLoaded}
                >
                  Sync Now
                </Button>
                <Button
                  onClick={saveDesktopConfig}
                  disabled={cloudBusy || !window.api?.apiRequest || !desktopConfigLoaded}
                >
                  Save Cloud Settings
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                These items are stored locally in the desktop app config file.
              </p>
              {cloudStatus && (
                <p className="text-sm text-muted-foreground">{cloudStatus}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={processSync}
                  disabled={syncOpsBusy}
                >
                  Process Sync Queue
                </Button>
                <Button
                  variant="outline"
                  onClick={retryFailedSync}
                  disabled={syncOpsBusy}
                >
                  Retry Failed Sync
                </Button>
                <Button variant="outline" onClick={exportBackup}>
                  Export Backup
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use backup before restore. Restore is destructive and intended
                for supervised recovery only.
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Restore file path (validation only)"
                  value={restoreFilePath}
                  onChange={(e) => setRestoreFilePath(e.target.value)}
                />
                <Button variant="outline" onClick={validateRestore}>
                  Validate Restore
                </Button>
                <Button variant="outline" onClick={executeRestore}>
                  Execute Restore
                </Button>
              </div>
              {syncMessage && (
                <p className="text-sm text-muted-foreground">{syncMessage}</p>
              )}
              {backupMessage && (
                <p className="text-sm text-muted-foreground">{backupMessage}</p>
              )}
              {restoreValidation && (
                <p className="text-sm text-muted-foreground">
                  {restoreValidation}
                </p>
              )}
              {restoreExecMessage && (
                <p className="text-sm text-muted-foreground">
                  {restoreExecMessage}
                </p>
              )}
              {startupDiagnostics && (
                <div className="rounded-md border p-3 text-xs space-y-1">
                  <p>Platform: {startupDiagnostics.platform}</p>
                  <p>App Version: {startupDiagnostics.appVersion}</p>
                  <p>SQLite Path: {startupDiagnostics.sqliteFilePath}</p>
                  <p>
                    Backend Running: {String(startupDiagnostics.backendRunning)}
                  </p>
                  <p>Runtime Log: {startupDiagnostics.logPath}</p>
                  {startupDiagnostics.lastStartupError ? (
                    <p className="text-red-600">
                      Startup Error: {startupDiagnostics.lastStartupError}
                    </p>
                  ) : (
                    <p className="text-emerald-700">Startup Status: healthy</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
