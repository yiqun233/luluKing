import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  createPlan,
  updatePlan,
  deletePlan,
  getPlans,
  getPlansByType,
} from "@/repositories/planRepo";
import type { Plan } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makePlan = (over: Partial<Plan> = {}): Plan => ({
  id: 1,
  type: "week",
  period_start: "2026-08-11",
  period_end: "2026-08-17",
  content: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("createPlan", () => {
  it("插入并按 lastInsertId 回查", async () => {
    const mockPlan = makePlan({ id: 4, content: "本周计划" });
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 4 });
    mockSelectOne.mockResolvedValue(mockPlan);

    const result = await createPlan({
      type: "week",
      period_start: "2026-08-11",
      period_end: "2026-08-17",
      content: "本周计划",
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO plans"),
      ["week", "2026-08-11", "2026-08-17", "本周计划"]
    );
    expect(mockSelectOne).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM plans WHERE id = ?"),
      [4]
    );
    expect(result).toEqual(mockPlan);
  });

  it("未提供 content 时传 null", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
    mockSelectOne.mockResolvedValue(makePlan());
    await createPlan({
      type: "month",
      period_start: "2026-08-01",
      period_end: "2026-08-31",
    });
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), [
      "month",
      "2026-08-01",
      "2026-08-31",
      null,
    ]);
  });
});

describe("updatePlan - 动态 SET", () => {
  it("单字段更新", async () => {
    await updatePlan(1, { content: "新内容" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE plans SET content = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新内容", 1]
    );
  });

  it("多字段更新按代码顺序拼接", async () => {
    await updatePlan(1, { content: "x", period_start: "2026-08-11" });
    // 代码顺序：period_start(2) 先于 content(4)
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE plans SET period_start = ?, content = ?, updated_at = datetime('now') WHERE id = ?`,
      ["2026-08-11", "x", 1]
    );
  });

  it("null 值字段传递（清空 content）", async () => {
    await updatePlan(1, { content: null });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE plans SET content = ?, updated_at = datetime('now') WHERE id = ?`,
      [null, 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updatePlan(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("deletePlan", () => {
  it("软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deletePlan(6);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE plans SET deleted_at"),
      [6]
    );
  });
});

describe("查询函数", () => {
  it("getPlans 查询未删除", async () => {
    mockSelect.mockResolvedValue([]);
    await getPlans();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("FROM plans")
    );
  });

  it("getPlansByType 按类型查询", async () => {
    mockSelect.mockResolvedValue([]);
    await getPlansByType("week");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("type = ?"),
      ["week"]
    );
  });
});
