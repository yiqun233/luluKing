import { describe, it, expect, vi, beforeEach } from "vitest";

// mock db client，只验证 SQL 构造与参数绑定
vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTasksByPlanDate,
  getBacklogTasks,
  getOverdueTasks,
  getActiveTasks,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/repositories/taskRepo";
import type { Task, ChecklistItem } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makeTask = (over: Partial<Task> = {}): Task => ({
  id: 1,
  title: "任务",
  status: "todo",
  plan_date: null,
  due_date: null,
  is_key: 0,
  project_id: null,
  notes: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTask", () => {
  it("用正确 SQL 和参数插入，并按 lastInsertId 回查", async () => {
    const mockTask = makeTask({ id: 7, title: "测试" });
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 7 });
    mockSelectOne.mockResolvedValue(mockTask);

    const result = await createTask({ title: "测试", plan_date: "2026-08-12" });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO tasks"),
      ["测试", "2026-08-12", null, 0, null, null]
    );
    expect(mockSelectOne).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM tasks WHERE id = ?"),
      [7]
    );
    expect(result).toEqual(mockTask);
  });

  it("未提供 plan_date 时传 null", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
    mockSelectOne.mockResolvedValue(makeTask());
    await createTask({ title: "待办" });
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), [
      "待办",
      null,
      null,
      0,
      null,
      null,
    ]);
  });

  it("显式传入 is_key 与 due_date", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
    mockSelectOne.mockResolvedValue(makeTask());
    await createTask({ title: "重点", is_key: 1, due_date: "2026-08-20" });
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), [
      "重点",
      null,
      "2026-08-20",
      1,
      null,
      null,
    ]);
  });
});

describe("updateTask - 动态 SET 构造", () => {
  it("单字段更新", async () => {
    await updateTask(1, { title: "新标题" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE tasks SET title = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新标题", 1]
    );
  });

  it("多字段更新按顺序拼接", async () => {
    await updateTask(1, { title: "x", status: "done", is_key: 1 });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE tasks SET title = ?, status = ?, is_key = ?, updated_at = datetime('now') WHERE id = ?`,
      ["x", "done", 1, 1]
    );
  });

  it("null 值字段正常传递（如清空日期）", async () => {
    await updateTask(1, { plan_date: null, due_date: null });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE tasks SET plan_date = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?`,
      [null, null, 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updateTask(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("updateTaskStatus", () => {
  it("更新状态字段", async () => {
    await updateTaskStatus(3, "done");
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      ["done", 3]
    );
  });
});

describe("deleteTask", () => {
  it("软删除任务并级联软删除子项", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteTask(5);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("UPDATE tasks SET deleted_at"),
      [5]
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE checklist_items SET deleted_at"),
      [5]
    );
  });
});

describe("查询函数", () => {
  it("getTasksByPlanDate 按日期查询", async () => {
    mockSelect.mockResolvedValue([]);
    await getTasksByPlanDate("2026-08-12");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("WHERE plan_date = ?"),
      ["2026-08-12"]
    );
  });

  it("getBacklogTasks 查询无计划日期的待办", async () => {
    mockSelect.mockResolvedValue([]);
    await getBacklogTasks();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("plan_date IS NULL")
    );
  });

  it("getOverdueTasks 按截止日期查询", async () => {
    mockSelect.mockResolvedValue([]);
    await getOverdueTasks("2026-08-12");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("due_date < ?"),
      ["2026-08-12"]
    );
  });

  it("getActiveTasks 查询未完成", async () => {
    mockSelect.mockResolvedValue([]);
    await getActiveTasks();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("status = 'todo'")
    );
  });
});

describe("清单子任务", () => {
  it("createChecklistItem 插入并回查", async () => {
    const mockItem: ChecklistItem = {
      id: 10,
      task_id: 1,
      title: "子任务",
      done: 0,
      sort_order: 0,
      created_at: "2026-08-12 10:00:00",
      updated_at: "2026-08-12 10:00:00",
      deleted_at: null,
      synced_at: null,
    };
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 10 });
    mockSelectOne.mockResolvedValue(mockItem);

    const result = await createChecklistItem(1, "子任务");
    expect(mockExecute).toHaveBeenCalledWith(
      `INSERT INTO checklist_items (task_id, title) VALUES (?, ?)`,
      [1, "子任务"]
    );
    expect(result?.id).toBe(10);
  });

  it("toggleChecklistItem 更新 done", async () => {
    await toggleChecklistItem(3, 1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("SET done = ?"),
      [1, 3]
    );
  });

  it("deleteChecklistItem 软删除", async () => {
    await deleteChecklistItem(8);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("SET deleted_at"),
      [8]
    );
  });
});
