// ============================================================
// 目标数据访问层
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type {
  Goal,
  GoalStatus,
  GoalPeriodType,
  GoalProgressType,
} from "@/types/entities";

export interface CreateGoalInput {
  title: string;
  period_type: GoalPeriodType;
  period_value?: string | null;
  progress_type: GoalProgressType;
  progress_target?: number | null;
  notes?: string | null;
}

export interface UpdateGoalInput {
  title?: string;
  period_type?: GoalPeriodType;
  period_value?: string | null;
  progress_type?: GoalProgressType;
  progress_target?: number | null;
  progress_current?: number;
  status?: GoalStatus;
  notes?: string | null;
}

export async function getGoals(): Promise<Goal[]> {
  return select<Goal>(
    `SELECT * FROM goals
     WHERE deleted_at IS NULL
     ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'done' THEN 1 ELSE 2 END,
       CASE period_type WHEN 'quarter' THEN 0 WHEN 'year' THEN 1 ELSE 2 END,
       created_at ASC`
  );
}

export async function getActiveGoals(): Promise<Goal[]> {
  return select<Goal>(
    `SELECT * FROM goals
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY period_type ASC, created_at ASC`
  );
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const result = await execute(
    `INSERT INTO goals (title, period_type, period_value, progress_type, progress_target, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.period_type,
      input.period_value ?? null,
      input.progress_type,
      input.progress_target ?? null,
      input.notes ?? null,
    ]
  );
  return (await selectOne<Goal>(`SELECT * FROM goals WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updateGoal(
  id: number,
  input: UpdateGoalInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.period_type !== undefined) {
    fields.push("period_type = ?");
    values.push(input.period_type);
  }
  if (input.period_value !== undefined) {
    fields.push("period_value = ?");
    values.push(input.period_value);
  }
  if (input.progress_type !== undefined) {
    fields.push("progress_type = ?");
    values.push(input.progress_type);
  }
  if (input.progress_target !== undefined) {
    fields.push("progress_target = ?");
    values.push(input.progress_target);
  }
  if (input.progress_current !== undefined) {
    fields.push("progress_current = ?");
    values.push(input.progress_current);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.notes !== undefined) {
    fields.push("notes = ?");
    values.push(input.notes);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE goals SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteGoal(id: number): Promise<void> {
  await execute(
    `UPDATE goals SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}
