import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { select } from "@/db/client";
import { searchAll } from "@/repositories/searchRepo";

const mockSelect = vi.mocked(select);

beforeEach(() => vi.clearAllMocks());

describe("searchAll", () => {
  it("跨四类实体搜索并合并结果", async () => {
    // Promise.all 顺序：tasks, notes, projects, goals
    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "优化性能", status: "todo" }])
      .mockResolvedValueOnce([
        { id: 2, title: "性能笔记", content: "React并发渲染" },
      ])
      .mockResolvedValueOnce([{ id: 3, title: "性能优化", type: "delivery" }])
      .mockResolvedValueOnce([{ id: 4, title: "掌握性能体系" }]);

    const results = await searchAll("性能");

    // 每类 LIKE 查询都带 %关键词% 参数
    expect(mockSelect).toHaveBeenCalledTimes(4);
    // 任务查询参数
    expect(mockSelect).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM tasks"),
      ["%性能%"]
    );
    // 笔记查询有两个 LIKE 参数（title OR content）
    expect(mockSelect).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM notes"),
      ["%性能%", "%性能%"]
    );

    expect(results).toHaveLength(4);
    expect(results[0]).toEqual({
      type: "task",
      id: 1,
      title: "优化性能",
      subtitle: undefined,
    });
    expect(results[1].type).toBe("note");
    expect(results[2].type).toBe("project");
    expect(results[2].subtitle).toBe("交付项目");
    expect(results[3].type).toBe("goal");
  });

  it("笔记无标题时用内容前 30 字作标题", async () => {
    mockSelect
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 1, title: null, content: "这是一段很长的内容用于测试无标题的情况" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const results = await searchAll("内容");
    expect(results[0].title).toBe("这是一段很长的内容用于测试无标题的情况".slice(0, 30));
  });

  it("空结果", async () => {
    mockSelect
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const results = await searchAll("不存在的");
    expect(results).toHaveLength(0);
  });
});
