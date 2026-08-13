import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAIConfig, saveAIConfig, callAI } from "@/ai/aiClient";

export function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [testMsg, setTestMsg] = useState("");

  // 首次进入读取已存配置；API Key 只回显掩码，不暴露明文
  useEffect(() => {
    getAIConfig().then((cfg) => {
      if (cfg) {
        setApiKey(cfg.apiKey ? "•".repeat(Math.min(cfg.apiKey.length, 16)) : "");
        setBaseUrl(cfg.baseUrl);
        setModel(cfg.model);
      }
      setLoaded(true);
    });
  }, []);

  // Key 输入框被改动时清掉掩码标记，用 keyEdited 区分"未改动"与"改为空"
  const [keyEdited, setKeyEdited] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg("");
    try {
      const patch: { apiKey?: string; baseUrl?: string; model?: string } = {};
      if (keyEdited) patch.apiKey = apiKey.trim();
      if (baseUrl.trim()) patch.baseUrl = baseUrl.trim();
      if (model.trim()) patch.model = model.trim();
      await saveAIConfig(patch);
      setSavedMsg("已保存");
      setTimeout(() => setSavedMsg(""), 2000);
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
      setTestMsg(e instanceof Error ? e.message : "连接失败");
    } finally {
      setTesting(false);
    }
  };

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
        </div>
      </div>
    </div>
  );
}
