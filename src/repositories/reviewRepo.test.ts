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
  it("聚合任务/收件箱/逾期/目标统计", async () => {
    // 顺序：doneTasks, totalTasks, inboxCount, overdueCount（4 次 selectOne），goals（1 次 select）
    mockSelectOne
      .mockResolvedValueOnce({ c: 3 })
      .mockResolvedValueOnce({ c: 5 })
      .mockResolvedValueOnce({ c: 8 })
      .mockResolvedValueOnce({ c: 2 });
    mockSelect.mockResolvedValue([
      { title: "读书", current: 12, target: 20 },
      { title: "运动", current: 80, target: 150 },
    ]);

    const summary = await generateReviewSummary(
      "2026-08-11",
      "2026-08-17"
    );

    expect(summary.doneTasks).toBe(3);
    expect(summary.totalTasks).toBe(5);
    expect(summary.inboxCount).toBe(8);
    expect(summary.overdueCount).toBe(2);
    expect(summary.goals).toHaveLength(2);
    expect(summary.goals[0]).toEqual({
      title: "读书",
      current: 12,
      target: 20,
    });
  });
});

describe("formatReviewSummary", () => {
  it("格式化摘要文本", () => {
    const s: ReviewSummary = {
      doneTasks: 3,
      totalTasks: 5,
      inboxCount: 8,
      overdueCount: 2,
      goals: [{ title: "读书", current: 12, target: 20 }],
    };
    const text = formatReviewSummary(s);
    expect(text).toContain("完成 3/5");
    expect(text).toContain("8 条待整理");
    expect(text).toContain("2 条待重新安排");
    expect(text).toContain("读书 12/20");
  });

  it("无目标时不显示目标段", () => {
    const text = formatReviewSummary({
      doneTasks: 0,
      totalTasks: 0,
      inboxCount: 0,
      overdueCount: 0,
      goals: [],
    });
    expect(text).not.toContain("目标进度");
  });
});
