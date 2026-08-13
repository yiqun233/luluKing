import { useEffect, useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  Loader2,
  Check,
  AlertCircle,
  HardDriveDownload,
  FileUp,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAIConfig, saveAIConfig, callAI, getAIErrorMessage } from "@/ai/aiClient";
import { feedback } from "@/components/feedback/FeedbackProvider";
import {
  createBackup,
  getLatestBackup,
  previewBackup,
  restoreBackup,
  type BackupPreview,
} from "@/backup/backupService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [testMsg, setTestMsg] = useState("");
  const [latestBackup, setLatestBackup] = useState<BackupPreview | null>(null);
  const [backupLoaded, setBackupLoaded] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [backupError, setBackupError] = useState("");
  const [restoreRaw, setRestoreRaw] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupPreview | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // 首次进入读取已存配置；API Key 只回显掩码，不暴露明文
  useEffect(() => {
    getAIConfig()
      .then((cfg) => {
        if (cfg) {
          setApiKey(cfg.apiKey ? "•".repeat(Math.min(cfg.apiKey.length, 16)) : "");
          setBaseUrl(cfg.baseUrl);
          setModel(cfg.model);
        }
      })
      .catch(() => setSaveError("无法读取 AI 配置，请稍后重试"))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    let active = true;
    getLatestBackup()
      .then((backup) => {
        if (active) setLatestBackup(backup);
      })
      .catch(() => {
        if (active) setBackupError("无法读取最近备份信息");
      })
      .finally(() => {
        if (active) setBackupLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Key 输入框被改动时清掉掩码标记，用 keyEdited 区分"未改动"与"改为空"
  const [keyEdited, setKeyEdited] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg("");
    setSaveError("");
    try {
      const patch: { apiKey?: string; baseUrl?: string; model?: string } = {};
      if (keyEdited) patch.apiKey = apiKey.trim();
      if (baseUrl.trim()) patch.baseUrl = baseUrl.trim();
      if (model.trim()) patch.model = model.trim();
      await saveAIConfig(patch);
      setSavedMsg("已保存");
      setTimeout(() => setSavedMsg(""), 2000);
      feedback.success("AI 配置已保存");
    } catch {
      setSaveError("保存失败，请检查配置后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMsg("");
    try {
      await callAI("ping");
      setTestResult("ok");
      setTestMsg("连接成功");
    } catch (e) {
      setTestResult("fail");
      setTestMsg(getAIErrorMessage(e));
    } finally {
      setTesting(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupMsg("");
    setBackupError("");
    try {
      const backup = await createBackup();
      setLatestBackup(backup);
      setBackupMsg("备份已创建");
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "备份创建失败，请稍后重试");
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setRestoreError("");
    setBackupMsg("");
    try {
      const raw = await file.text();
      setRestoreRaw(raw);
      setRestorePreview(previewBackup(file.name, raw));
    } catch (error) {
      setRestoreRaw(null);
      setRestorePreview(null);
      setRestoreError(error instanceof Error ? error.message : "无法读取备份文件");
    }
  };

  const closeRestoreDialog = () => {
    if (restoring) return;
    setRestoreRaw(null);
    setRestorePreview(null);
  };

  const handleRestore = async () => {
    if (!restoreRaw) return;
    setRestoring(true);
    setRestoreError("");
    try {
      await restoreBackup(restoreRaw);
      window.location.reload();
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "恢复失败，请稍后重试");
      setRestoring(false);
    }
  };

  const latestBackupText = latestBackup
    ? new Date(latestBackup.exportedAt).toLocaleString("zh-CN", { hour12: false })
    : "暂无备份";
  const restoreTotal = restorePreview
    ? Object.values(restorePreview.recordCounts).reduce((total, count) => total + count, 0)
    : 0;

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载中…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b px-6 py-4">
        <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-xl space-y-6">
          <section className="space-y-4 rounded-md border bg-card p-5">
            <div>
              <h2 className="text-sm font-semibold">AI 配置</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                用于复盘草稿生成等 AI 功能。兼容 OpenAI 接口格式（OpenAI / Claude 兼容接口 / 国内模型等）。
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai-key">API Key</Label>
              <Input
                id="ai-key"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setKeyEdited(true);
                }}
                placeholder="sk-…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai-base">Base URL</Label>
              <Input
                id="ai-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai-model">模型</Label>
              <Input
                id="ai-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !apiKey.trim()}
              >
                {testing ? "测试中…" : "测试连接"}
              </Button>
              {savedMsg && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-green-500" />
                  {savedMsg}
                </span>
              )}
              {saveError && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {saveError}
                </span>
              )}
              {testResult && (
                <span
                  className={`flex items-center gap-1 text-xs ${
                    testResult === "ok" ? "text-green-600" : "text-destructive"
                  }`}
                >
                  {testResult === "ok" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {testMsg}
                </span>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-md border bg-card p-5">
            <div>
              <h2 className="text-sm font-semibold">数据备份</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                备份保存在应用数据目录，仅包含业务数据；不包含附件文件、AI 配置和 API Key。
              </p>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {backupLoaded ? `最近备份：${latestBackupText}` : "正在读取备份信息…"}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleBackup} disabled={backingUp || !backupLoaded}>
                {backingUp ? (
                  <>
                    <Loader2 className="animate-spin" />
                    备份中…
                  </>
                ) : (
                  <>
                    <HardDriveDownload />
                    立即备份
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => restoreFileInputRef.current?.click()}
                disabled={backingUp || restoring}
              >
                <FileUp />
                从备份恢复
              </Button>
              <input
                ref={restoreFileInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={handleRestoreFileChange}
              />
              {backupMsg && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  {backupMsg}
                </span>
              )}
              {backupError && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {backupError}
                </span>
              )}
              {restoreError && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {restoreError}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={restorePreview !== null}
        onOpenChange={(open) => {
          if (!open) closeRestoreDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认恢复备份</DialogTitle>
            <DialogDescription>
              此操作会完全替换当前业务数据。恢复前会自动创建一份当前数据的安全备份。
            </DialogDescription>
          </DialogHeader>

          {restorePreview && (
            <div className="space-y-3 rounded-md bg-muted/50 p-3 text-sm">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
                <span>备份文件</span>
                <span className="break-all text-foreground">{restorePreview.filename}</span>
                <span>导出时间</span>
                <span className="text-foreground">
                  {new Date(restorePreview.exportedAt).toLocaleString("zh-CN", { hour12: false })}
                </span>
                <span>来源版本</span>
                <span className="text-foreground">
                  应用 {restorePreview.appVersion} · 数据库 {restorePreview.databaseVersion}
                </span>
                <span>数据数量</span>
                <span className="text-foreground">共 {restoreTotal} 条业务记录</span>
              </div>
              <p className="text-xs text-muted-foreground">附件文件不在当前备份内；如果现有数据存在附件，恢复会被安全拒绝。</p>
            </div>
          )}

          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            恢复成功后应用会重新加载。此版本不支持合并或选择性恢复。
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRestoreDialog} disabled={restoring}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleRestore} disabled={restoring}>
              {restoring ? (
                <>
                  <Loader2 className="animate-spin" />
                  恢复中…
                </>
              ) : (
                <>
                  <RotateCcw />
                  创建安全备份并恢复
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
