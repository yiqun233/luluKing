import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { select } from "@/db/client";
import {
  getSearchResultPath,
  parseSearchQuery,
  searchAll,
} from "@/repositories/searchRepo";

const mockSelect = vi.mocked(select);

beforeEach(() => vi.clearAllMocks());

describe("parseSearchQuery", () => {
  it("解析中文类型、标签和状态筛选", () => {
    expect(parseSearchQuery("type:任务 tag:性能 status:未完成 缓存")).toEqual({
      types: ["task"],
      tag: "性能",
      status: "todo",
      text: "缓存",
    });
  });

  it("将无法识别的筛选语法当作普通关键词", () => {
    expect(parseSearchQuery("type:未知 status:其他 功能")).toEqual({
      types: [],
      tag: null,
      status: null,
      text: "type:未知 status:其他 功能",
    });
  });
});

describe("searchAll", () => {
  it("跨八类实体搜索并合并结果", async () => {
    mockSelect
      .mockResolvedValueOnce([
        { id: 1, title: "优化性能", status: "todo", plan_date: null, due_date: null },
      ])
      .mockResolvedValueOnce([
        { id: 2, title: "性能笔记", content: "React并发渲染", status: "knowledge" },
      ])
      .mockResolvedValueOnce([
        { id: 3, title: "性能优化", type: "delivery", status: "active" },
      ])
      .mockResolvedValueOnce([
        { id: 4, title: "掌握性能体系", period_value: "2026Q3", status: "active" },
      ])
      .mockResolvedValueOnce([
        { id: 5, title: "每日复盘", frequency_type: "daily", status: "active" },
      ])
      .mockResolvedValueOnce([
        { id: 6, title: "性能评审", date: "2026-08-24", start_time: "10:00" },
      ])
      .mockResolvedValueOnce([
        {
          id: 7,
          type: "week",
          period_start: "2026-08-18",
          status: "draft",
          auto_summary: "性能问题",
          content: null,
        },
      ])
      .mockResolvedValueOnce([{ id: 8, name: "性能", color: "#ff0000" }]);

    const results = await searchAll("性能");

    expect(mockSelect).toHaveBeenCalledTimes(8);
    expect(mockSelect).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM tasks"),
      ["task", "性能*", 20]
    );
    expect(mockSelect).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM notes"),
      ["note", "性能*", 20]
    );
    expect(results.map((result) => result.type)).toEqual(
      expect.arrayContaining([
        "task",
        "note",
        "project",
        "goal",
        "habit",
        "event",
        "review",
        "tag",
      ])
    );
    expect(results.find((result) => result.type === "task")).toMatchObject({
      id: 1,
      title: "优化性能",
      subtitle: "未完成",
    });
    expect(results.find((result) => result.type === "note")).toMatchObject({
      noteStatus: "knowledge",
    });
    expect(results.find((result) => result.type === "review")).toMatchObject({
      reviewType: "week",
    });
  });

  it("类型、标签和状态筛选仅查询匹配实体，并使用参数绑定", async () => {
    mockSelect.mockResolvedValueOnce([]);

    await searchAll("type:任务 tag:性能 status:未完成 缓存");

    expect(mockSelect).toHaveBeenCalledTimes(1);
    const [sql, bindValues] = mockSelect.mock.calls[0];
    expect(sql).toContain("FROM tasks");
    expect(sql).toContain("EXISTS");
    expect(sql).toContain("status = 'todo'");
    expect(bindValues).toEqual(["task", "缓存*", "task", "性能", 20]);
  });

  it("筛选语法本身也可触发无关键词查询", async () => {
    mockSelect.mockResolvedValueOnce([]);

    await searchAll("type:标签");

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockSelect.mock.calls[0][0]).toContain("FROM tags");
    expect(mockSelect.mock.calls[0][1]).toEqual([20]);
  });

  it("空查询不读取数据库", async () => {
    expect(await searchAll("   ")).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("仅含特殊字符的关键词不会生成无效 FTS 查询", async () => {
    mockSelect.mockResolvedValue([]);

    await expect(searchAll("!!!")).resolves.toEqual([]);
    expect(mockSelect).toHaveBeenCalledTimes(8);
    expect(mockSelect.mock.calls[0][0]).toContain("1 = 0");
  });
});

describe("getSearchResultPath", () => {
  it("为各类结果生成可定位的页面链接", () => {
    expect(getSearchResultPath({ type: "task", id: 1, title: "任务" })).toBe(
      "/tasks?open=1"
    );
    expect(
      getSearchResultPath({
        type: "note",
        id: 2,
        title: "收件箱笔记",
        noteStatus: "inbox",
      })
    ).toBe("/inbox?open=2");
    expect(
      getSearchResultPath({
        type: "event",
        id: 3,
        title: "会议",
        eventDate: "2026-08-24",
      })
    ).toBe("/calendar?open=3&date=2026-08-24");
    expect(getSearchResultPath({ type: "tag", id: 4, title: "性能" })).toBe(
      "/tags?open=4"
    );
  });
});
