import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  createReview,
  updateReview,
  deleteReview,
  generateReviewSummary,
  formatReviewSummary,
  prevPeriod,
  periodDays,
  type ReviewSummary,
} from "@/repositories/reviewRepo";
import type { Review } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makeReview = (over: Partial<Review> = {}): Review => ({
  id: 1,
  type: "week",
  period_start: "2026-08-11",
  period_end: "2026-08-17",
  auto_summary: null,
  content: null,
  status: "draft",
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("createReview", () => {
  it("插入并回查", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 4 });
    mockSelectOne.mockResolvedValue(makeReview({ id: 4 }));

    await createReview({
      type: "week",
      period_start: "2026-08-11",
      period_end: "2026-08-17",
      auto_summary: "摘要",
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO reviews"),
      ["week", "2026-08-11", "2026-08-17", "摘要", null]
    );
  });
});

describe("updateReview - 动态 SET", () => {
  it("单字段更新", async () => {
    await updateReview(1, { content: "新内容" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE reviews SET content = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新内容", 1]
    );
  });

  it("多字段按代码顺序拼接", async () => {
    await updateReview(1, { status: "done", content: "x" });
    // 代码顺序：content(5) 先于 status(6)
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE reviews SET content = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      ["x", "done", 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updateReview(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("deleteReview", () => {
  it("软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteReview(6);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE reviews SET deleted_at"),
      [6]
    );
  });
});

describe("generateReviewSummary", () => {
  it("聚合任务/收件箱/逾期/目标/习惯统计", async () => {
    // selectOne 调用顺序（6 次）：doneTasks, totalTasks, prevDone, prevTotal, inboxCount, overdueCount
    mockSelectOne
      .mockResolvedValueOnce({ c: 3 }) // doneTasks
      .mockResolvedValueOnce({ c: 5 }) // totalTasks
      .mockResolvedValueOnce({ c: 5 }) // prevDone
      .mockResolvedValueOnce({ c: 5 }) // prevTotal
      .mockResolvedValueOnce({ c: 8 }) // inbox
      .mockResolvedValueOnce({ c: 2 }); // overdue
    // select 调用顺序：goals，habits
    mockSelect
      .mockResolvedValueOnce([
        { title: "读书", current: 12, target: 20 },
        { title: "运动", current: 80, target: 150 },
      ])
      .mockResolvedValueOnce([
        { title: "阅读", frequency_type: "daily", frequency_target: 1, count: 7 },
        { title: "运动", frequency_type: "weekly", frequency_target: 3, count: 2 },
      ]);

    const summary = await generateReviewSummary("2026-08-11", "2026-08-17");

    expect(summary.doneTasks).toBe(3);
    expect(summary.totalTasks).toBe(5);
    expect(summary.prevDoneTasks).toBe(5);
    expect(summary.prevTotalTasks).toBe(5);
    expect(summary.inboxCount).toBe(8);
    expect(summary.overdueCount).toBe(2);
    expect(summary.goals).toHaveLength(2);
    // 7 天周期：daily 目标 7，weekly 目标 3
    expect(summary.habits).toEqual([
      { title: "阅读", count: 7, target: 7 },
      { title: "运动", count: 2, target: 3 },
    ]);
  });
});

describe("prevPeriod / periodDays", () => {
  it("7 天周复盘的上一周期", () => {
    expect(periodDays("2026-08-11", "2026-08-17")).toBe(7);
    expect(prevPeriod("2026-08-11", "2026-08-17")).toEqual({
      start: "2026-08-04",
      end: "2026-08-10",
    });
  });

  it("月复盘上一周期跨月", () => {
    expect(prevPeriod("2026-08-01", "2026-08-31")).toEqual({
      start: "2026-07-01",
      end: "2026-07-31",
    });
  });
});

describe("formatReviewSummary", () => {
  it("任务行带周期对比与异常标记", () => {
    const text = formatReviewSummary({
      doneTasks: 3,
      totalTasks: 5,
      prevDoneTasks: 5,
      prevTotalTasks: 5,
      inboxCount: 8,
      overdueCount: 2,
      goals: [{ title: "读书", current: 12, target: 20 }],
      habits: [
        { title: "阅读", count: 7, target: 7 },
        { title: "运动", count: 2, target: 3 },
        { title: "冥想", count: 0, target: 7 },
      ],
    });
    expect(text).toContain("完成 3/5（上期 5/5 ↓ 下降）");
    expect(text).toContain("阅读 7/7 ✓");
    expect(text).toContain("运动 2/3 ⚠ 差 1 次");
    expect(text).toContain("冥想 0/7 ⚠ 本期零打卡");
    expect(text).toContain("8 条待整理");
    expect(text).toContain("2 条待重新安排");
    expect(text).toContain("读书 12/20");
  });

  it("目标完成率不足一半标落后", () => {
    const text = formatReviewSummary({
      doneTasks: 0,
      totalTasks: 0,
      prevDoneTasks: 0,
      prevTotalTasks: 0,
      inboxCount: 0,
      overdueCount: 0,
      goals: [
        { title: "A", current: 2, target: 10 },
        { title: "B", current: 8, target: 10 },
      ],
      habits: [],
    });
    expect(text).toContain("A 2/10 ⚠ 落后");
    expect(text).toContain("B 8/10"); // 过半不标落后
  });

  it("无上期数据时不显示对比", () => {
    const text = formatReviewSummary({
      doneTasks: 1,
      totalTasks: 2,
      prevDoneTasks: 0,
      prevTotalTasks: 0,
      inboxCount: 0,
      overdueCount: 0,
      goals: [],
      habits: [],
    });
    expect(text).toContain("完成 1/2");
    expect(text).not.toContain("上期");
  });

  it("无目标与习惯时省略对应段", () => {
    const text = formatReviewSummary({
      doneTasks: 0,
      totalTasks: 0,
      prevDoneTasks: 0,
      prevTotalTasks: 0,
      inboxCount: 0,
      overdueCount: 0,
      goals: [],
      habits: [],
    });
    expect(text).not.toContain("目标进度");
    expect(text).not.toContain("习惯");
  });
});
