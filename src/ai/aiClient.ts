import { fetch } from "@tauri-apps/plugin-http";
import { LazyStore } from "@tauri-apps/plugin-store";

const store = new LazyStore("settings.json");

// ============================================================
// AI 调用层
// 支持 OpenAI 兼容的 API（OpenAI / Claude 兼容接口 / 国内模型等）
// ============================================================

export interface AIConfig {
  apiKey: string;
  baseUrl: string; // 如 https://api.openai.com/v1
  model: string; // 如 gpt-4o
}

export interface AICallOptions {
  systemPrompt?: string;
  temperature?: number;
  onStream?: (chunk: string) => void;
  signal?: AbortSignal;
}

/**
 * 读取 AI 配置
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  const apiKey = await store.get<string>("ai_apiKey");
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (await store.get<string>("ai_baseUrl")) || "https://api.openai.com/v1",
    model: (await store.get<string>("ai_model")) || "gpt-4o",
  };
}

/**
 * 保存 AI 配置
 */
export async function saveAIConfig(config: Partial<AIConfig>): Promise<void> {
  if (config.apiKey !== undefined) await store.set("ai_apiKey", config.apiKey);
  if (config.baseUrl !== undefined) await store.set("ai_baseUrl", config.baseUrl);
  if (config.model !== undefined) await store.set("ai_model", config.model);
  await store.save();
}

/**
 * 调用 AI（支持流式响应）
 * @param prompt 用户提示词
 * @param options 调用选项
 * @returns AI 完整回复文本
 */
export async function callAI(
  prompt: string,
  options: AICallOptions = {}
): Promise<string> {
  const config = await getAIConfig();
  if (!config) {
    throw new Error("AI 未配置，请先在设置中填写 API Key");
  }

  const messages = [
    ...(options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }]
      : []),
    { role: "user", content: prompt },
  ];

  const useStream = !!options.onStream;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.7,
      stream: useStream,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API 错误 (${response.status}): ${errorText}`);
  }

  if (useStream && response.body) {
    // 流式响应：逐块解析 SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            options.onStream!(delta);
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }
    return fullText;
  } else {
    // 非流式响应
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
}
