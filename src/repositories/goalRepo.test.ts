import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  getGoals,
  getActiveGoals,
} from "@/repositories/goalRepo";
import type { Goal } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makeGoal = (over: Partial<Goal> = {}): Goal => ({
  id: 1,
  title: "目标",
  period_type: "quarter",
  period_value: null,
  progress_type: "count",
  progress_target: null,
  progress_current: 0,
  status: "active",
  notes: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("createGoal", () => {
  it("插入并按 lastInsertId 回查", async () => {
    const mockGoal = makeGoal({ id: 5, title: "读书" });
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 5 });
    mockSelectOne.mockResolvedValue(mockGoal);

    const result = await createGoal({
      title: "读书",
      period_type: "quarter",
      progress_type: "count",
      progress_target: 3,
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO goals"),
      ["读书", "quarter", null, "count", 3, null]
    );
    expect(mockSelectOne).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM goals WHERE id = ?"),
      [5]
    );
    expect(result).toEqual(mockGoal);
  });

  it("未提供可选字段时传 null", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
    mockSelectOne.mockResolvedValue(makeGoal());
    await createGoal({
      title: "目标",
      period_type: "year",
      progress_type: "aggregate",
    });
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), [
      "目标",
      "year",
      null,
      "aggregate",
      null,
      null,
    ]);
  });
});

describe("updateGoal - 动态 SET", () => {
  it("单字段更新", async () => {
    await updateGoal(1, { title: "新标题" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE goals SET title = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新标题", 1]
    );
  });

  it("多字段更新按代码顺序拼接", async () => {
    await updateGoal(1, { progress_current: 2, status: "done" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE goals SET progress_current = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      [2, "done", 1]
    );
  });

  it("null 值字段按代码顺序传递", async () => {
    await updateGoal(1, { notes: null, progress_target: null });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE goals SET progress_target = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
      [null, null, 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updateGoal(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("deleteGoal", () => {
  it("软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteGoal(7);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE goals SET deleted_at"),
      [7]
    );
  });
});

describe("查询函数", () => {
  it("getGoals 查询未删除", async () => {
    mockSelect.mockResolvedValue([]);
    await getGoals();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("FROM goals")
    );
  });

  it("getActiveGoals 查询 active", async () => {
    mockSelect.mockResolvedValue([]);
    await getActiveGoals();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("status = 'active'")
    );
  });
});
