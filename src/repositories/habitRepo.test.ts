import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  createHabit,
  updateHabit,
  deleteHabit,
  getHabits,
  getActiveHabits,
  getHabitLogs,
  logHabit,
  unlogHabit,
} from "@/repositories/habitRepo";
import type { Habit } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makeHabit = (over: Partial<Habit> = {}): Habit => ({
  id: 1,
  title: "阅读",
  frequency_type: "daily",
  frequency_target: 1,
  goal_id: null,
  status: "active",
  pause_until: null,
  best_streak: 0,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("createHabit", () => {
  it("插入并回查，frequency_target 默认 1", async () => {
    const habit = makeHabit({ id: 3, title: "运动" });
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 3 });
    mockSelectOne.mockResolvedValue(habit);

    const result = await createHabit({ title: "运动", frequency_type: "daily" });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO habits"),
      ["运动", "daily", 1, null]
    );
    expect(result).toEqual(habit);
  });

  it("weekly 频率带 target", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
    mockSelectOne.mockResolvedValue(makeHabit());
    await createHabit({ title: "跑步", frequency_type: "weekly", frequency_target: 3 });
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), [
      "跑步",
      "weekly",
      3,
      null,
    ]);
  });
});

describe("updateHabit - 动态 SET", () => {
  it("单字段更新", async () => {
    await updateHabit(1, { status: "paused" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE habits SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      ["paused", 1]
    );
  });

  it("多字段按代码顺序拼接", async () => {
    await updateHabit(1, { title: "新标题", frequency_target: 5 });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE habits SET title = ?, frequency_target = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新标题", 5, 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updateHabit(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("deleteHabit", () => {
  it("软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteHabit(7);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE habits SET deleted_at"),
      [7]
    );
  });
});

describe("查询函数", () => {
  it("getHabits 查询未删除", async () => {
    mockSelect.mockResolvedValue([]);
    await getHabits();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("FROM habits")
    );
  });

  it("getActiveHabits 查询 active", async () => {
    mockSelect.mockResolvedValue([]);
    await getActiveHabits();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("status = 'active'")
    );
  });
});

describe("打卡记录", () => {
  it("getHabitLogs 返回日期数组", async () => {
    mockSelect.mockResolvedValue([
      { date: "2026-08-12" },
      { date: "2026-08-11" },
    ]);
    const result = await getHabitLogs(1);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("FROM habit_logs"),
      [1]
    );
    expect(result).toEqual(["2026-08-12", "2026-08-11"]);
  });

  it("logHabit 用 INSERT OR IGNORE 防重", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await logHabit(1, "2026-08-12");
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO habit_logs"),
      [1, "2026-08-12"]
    );
  });

  it("unlogHabit 物理删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await unlogHabit(1, "2026-08-12");
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM habit_logs"),
      [1, "2026-08-12"]
    );
  });
});
