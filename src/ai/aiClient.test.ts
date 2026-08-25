import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet, mockSet, mockSave, mockFetch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockSave: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    get = mockGet;
    set = mockSet;
    save = mockSave;
  },
}));
vi.mock("@tauri-apps/plugin-http", () => ({ fetch: mockFetch }));

import {
  callAI,
  getAIErrorMessage,
  normalizeAIBaseUrl,
  saveAIConfig,
} from "@/ai/aiClient";

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((key: string) => {
    const values: Record<string, string> = {
      ai_apiKey: "test-key",
      ai_baseUrl: "https://api.example.com/v1/",
      ai_model: "test-model",
    };
    return Promise.resolve(values[key]);
  });
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content: "pong" } }] }),
  });
});

describe("normalizeAIBaseUrl", () => {
  it("规范化 HTTPS 地址并去掉末尾斜杠", () => {
    expect(normalizeAIBaseUrl(" https://api.example.com/v1/ ")).toBe(
      "https://api.example.com/v1"
    );
  });

  it.each([
    "http://api.example.com/v1",
    "https://localhost/v1",
    "https://localhost:11434/v1",
    "https://user:pass@api.example.com/v1",
    "https://api.example.com/v1?debug=1",
  ])("拒绝不受支持的服务地址：%s", (value) => {
    expect(() => normalizeAIBaseUrl(value)).toThrow();
  });
});

describe("AI 请求安全边界", () => {
  it("请求使用规范化后的 HTTPS 端点", async () => {
    await expect(callAI("ping")).resolves.toBe("pong");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("保存前校验地址，校验失败不写入设置", async () => {
    await expect(saveAIConfig({ baseUrl: "http://localhost:11434/v1" })).rejects.toThrow(
      "必须使用 HTTPS"
    );
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("将地址错误转换成可理解的中文提示", () => {
    expect(getAIErrorMessage(new Error("AI 服务地址必须使用 HTTPS"))).toContain("HTTPS");
  });
});
