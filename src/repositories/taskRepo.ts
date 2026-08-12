// ============================================================
// 任务数据访问层
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type { Task, ChecklistItem, TaskStatus } from "@/types/entities";

export interface CreateTaskInput {
  title: string;
  plan_date?: string | null;
  due_date?: string | null;
  is_key?: number; // 0 | 1
  project_id?: number | null;
  notes?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  status?: TaskStatus;
  plan_date?: string | null;
  due_date?: string | null;
  is_key?: number;
  project_id?: number | null;
  notes?: string | null;
}

// 按计划日期查询任务（今日/指定日，含已完成，排除已放弃与已删除）
export async function getTasksByPlanDate(date: string): Promise<Task[]> {
  return select<Task>(
    `SELECT * FROM tasks
     WHERE plan_date = ? AND status != 'abandoned' AND deleted_at IS NULL
     ORDER BY is_key DESC, created_at ASC`,
    [date]
  );
}

// 待办池：无计划日期的待办任务
export async function getBacklogTasks(): Promise<Task[]> {
  return select<Task>(
    `SELECT * FROM tasks
     WHERE plan_date IS NULL AND status = 'todo' AND deleted_at IS NULL
     ORDER BY is_key DESC, due_date ASC, created_at ASC`
  );
}

// 逾期任务：截止日期已过仍未完成
export async function getOverdueTasks(date: string): Promise<Task[]> {
  return select<Task>(
    `SELECT * FROM tasks
     WHERE due_date < ? AND status = 'todo' AND deleted_at IS NULL
     ORDER BY due_date ASC`,
    [date]
  );
}

// 所有未完成任务（仪表盘概览用）
export async function getActiveTasks(): Promise<Task[]> {
  return select<Task>(
    `SELECT * FROM tasks
     WHERE status = 'todo' AND deleted_at IS NULL
     ORDER BY is_key DESC, plan_date ASC NULLS LAST, created_at ASC`
  );
}

export async function getTaskById(id: number): Promise<Task | null> {
  return selectOne<Task>(`SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL`, [
    id,
  ]);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const result = await execute(
    `INSERT INTO tasks (title, plan_date, due_date, is_key, project_id, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.plan_date ?? null,
      input.due_date ?? null,
      input.is_key ?? 0,
      input.project_id ?? null,
      input.notes ?? null,
    ]
  );
  const task = await selectOne<Task>(`SELECT * FROM tasks WHERE id = ?`, [
    result.lastInsertId,
  ]);
  return task!;
}

export async function updateTask(
  id: number,
  input: UpdateTaskInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.plan_date !== undefined) {
    fields.push("plan_date = ?");
    values.push(input.plan_date);
  }
  if (input.due_date !== undefined) {
    fields.push("due_date = ?");
    values.push(input.due_date);
  }
  if (input.is_key !== undefined) {
    fields.push("is_key = ?");
    values.push(input.is_key);
  }
  if (input.project_id !== undefined) {
    fields.push("project_id = ?");
    values.push(input.project_id);
  }
  if (input.notes !== undefined) {
    fields.push("notes = ?");
    values.push(input.notes);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
}

export async function updateTaskStatus(
  id: number,
  status: TaskStatus
): Promise<void> {
  await execute(
    `UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, id]
  );
}

// 软删除任务（同步级联清子项）
export async function deleteTask(id: number): Promise<void> {
  await execute(
    `UPDATE tasks SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
  await execute(
    `UPDATE checklist_items SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE task_id = ?`,
    [id]
  );
}

// ========== 清单子任务 ==========

export async function getChecklistItems(taskId: number): Promise<ChecklistItem[]> {
  return select<ChecklistItem>(
    `SELECT * FROM checklist_items
     WHERE task_id = ? AND deleted_at IS NULL
     ORDER BY sort_order ASC, id ASC`,
    [taskId]
  );
}

export async function createChecklistItem(
  taskId: number,
  title: string
): Promise<ChecklistItem> {
  const result = await execute(
    `INSERT INTO checklist_items (task_id, title) VALUES (?, ?)`,
    [taskId, title]
  );
  const item = await selectOne<ChecklistItem>(
    `SELECT * FROM checklist_items WHERE id = ?`,
    [result.lastInsertId]
  );
  return item!;
}

export async function toggleChecklistItem(
  id: number,
  done: number
): Promise<void> {
  await execute(
    `UPDATE checklist_items SET done = ?, updated_at = datetime('now') WHERE id = ?`,
    [done, id]
  );
}

export async function deleteChecklistItem(id: number): Promise<void> {
  await execute(
    `UPDATE checklist_items SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}
