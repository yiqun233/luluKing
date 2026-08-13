// ============================================================
// 习惯数据访问层
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type { Habit, HabitFrequencyType, HabitStatus } from "@/types/entities";

export interface CreateHabitInput {
  title: string;
  frequency_type: HabitFrequencyType;
  frequency_target?: number;
  goal_id?: number | null;
}

export interface UpdateHabitInput {
  title?: string;
  frequency_type?: HabitFrequencyType;
  frequency_target?: number;
  goal_id?: number | null;
  status?: HabitStatus;
  pause_until?: string | null;
}

export async function getHabits(): Promise<Habit[]> {
  return select<Habit>(
    `SELECT * FROM habits
     WHERE deleted_at IS NULL
     ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
       created_at ASC`
  );
}

export async function getActiveHabits(): Promise<Habit[]> {
  return select<Habit>(
    `SELECT * FROM habits
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY created_at ASC`
  );
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const result = await execute(
    `INSERT INTO habits (title, frequency_type, frequency_target, goal_id)
     VALUES (?, ?, ?, ?)`,
    [
      input.title,
      input.frequency_type,
      input.frequency_target ?? 1,
      input.goal_id ?? null,
    ]
  );
  return (await selectOne<Habit>(`SELECT * FROM habits WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updateHabit(
  id: number,
  input: UpdateHabitInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.frequency_type !== undefined) {
    fields.push("frequency_type = ?");
    values.push(input.frequency_type);
  }
  if (input.frequency_target !== undefined) {
    fields.push("frequency_target = ?");
    values.push(input.frequency_target);
  }
  if (input.goal_id !== undefined) {
    fields.push("goal_id = ?");
    values.push(input.goal_id);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.pause_until !== undefined) {
    fields.push("pause_until = ?");
    values.push(input.pause_until);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE habits SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteHabit(id: number): Promise<void> {
  await execute(
    `UPDATE habits SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

// ========== 打卡记录 ==========

/** 获取某习惯所有打卡日期（desc），用于连续天数/热力图计算 */
export async function getHabitLogs(habitId: number): Promise<string[]> {
  const rows = await select<{ date: string }>(
    `SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`,
    [habitId]
  );
  return rows.map((r) => r.date);
}

/** 打卡（UNIQUE 约束防重复，INSERT OR IGNORE 幂等） */
export async function logHabit(habitId: number, date: string): Promise<void> {
  await execute(
    `INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?, ?)`,
    [habitId, date]
  );
}

/** 取消打卡（habit_logs 无 deleted_at，物理删除） */
export async function unlogHabit(habitId: number, date: string): Promise<void> {
  await execute(
    `DELETE FROM habit_logs WHERE habit_id = ? AND date = ?`,
    [habitId, date]
  );
}
