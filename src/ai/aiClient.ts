import { fetch } from "@tauri-apps/plugin-http";
import { LazyStore } from "@tauri-apps/plugin-store";

const store = new LazyStore("settings.json");
const AI_REQUEST_TIMEOUT = 30_000;
const DEFAULT_AI_BASE_URL = "https://api.openai.com/v1";

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

export function getAIErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("AI 未配置")) {
    return "AI 未配置，请先在设置中填写 API Key";
  }
  if (message.includes("AI 请求已取消")) {
    return "AI 请求已取消";
  }
  if (message.includes("认证失败")) {
    return "AI 服务认证失败，请检查 API Key";
  }
  if (message.includes("请求过于频繁")) {
    return "AI 服务请求过于频繁，请稍后重试";
  }
  if (message.includes("响应超时")) {
    return "AI 服务响应超时，请稍后重试";
  }
  if (message.includes("AI 服务地址")) {
    return message;
  }
  return "AI 服务暂时不可用，请检查网络和配置后重试";
}

/**
 * 只允许标准 HTTPS 端点。Tauri capability 同样限制为 HTTPS 默认端口，
 * 避免配置页被用作访问本机服务或任意明文 HTTP 地址的跳板。
 */
export function normalizeAIBaseUrl(value: string): string {
  const raw = value.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("AI 服务地址格式不正确");
  }
  if (url.protocol !== "https:") {
    throw new Error("AI 服务地址必须使用 HTTPS，暂不支持本地或 HTTP 服务");
  }
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("AI 服务地址暂不支持本地服务");
  }
  if (url.port && url.port !== "443") {
    throw new Error("AI 服务地址只能使用 HTTPS 标准端口 443");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("AI 服务地址不能包含账号、查询参数或片段");
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}`;
}

/**
 * 读取 AI 配置
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  const apiKey = await store.get<string>("ai_apiKey");
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (await store.get<string>("ai_baseUrl")) || DEFAULT_AI_BASE_URL,
    model: (await store.get<string>("ai_model")) || "gpt-4o",
  };
}

/**
 * 保存 AI 配置
 */
export async function saveAIConfig(config: Partial<AIConfig>): Promise<void> {
  const baseUrl =
    config.baseUrl !== undefined ? normalizeAIBaseUrl(config.baseUrl) : undefined;
  if (config.apiKey !== undefined) await store.set("ai_apiKey", config.apiKey);
  if (baseUrl !== undefined) await store.set("ai_baseUrl", baseUrl);
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
  const baseUrl = normalizeAIBaseUrl(config.baseUrl);
  const endpoint = new URL("chat/completions", `${baseUrl}/`).toString();

  const messages = [
    ...(options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }]
      : []),
    { role: "user", content: prompt },
  ];

  const useStream = !!options.onStream;

  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  options.signal?.addEventListener("abort", abortRequest, { once: true });
  const timeoutId = setTimeout(
    () => requestController.abort(),
    AI_REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(endpoint, {
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
      signal: requestController.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("AI 服务认证失败");
      }
      if (response.status === 429) {
        throw new Error("AI 服务请求过于频繁");
      }
      if (response.status >= 500) {
        throw new Error("AI 服务暂时不可用");
      }
      throw new Error("AI 服务请求失败");
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
  } catch (error) {
    if (options.signal?.aborted) throw new Error("AI 请求已取消");
    if (requestController.signal.aborted) {
      throw new Error("AI 服务响应超时");
    }
    throw error instanceof Error ? error : new Error("无法连接 AI 服务");
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortRequest);
  }
}
