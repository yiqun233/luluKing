// ============================================================
// 复盘数据访问层（含自动摘要统计）
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type { Review, ReviewType, ReviewStatus } from "@/types/entities";

export interface CreateReviewInput {
  type: ReviewType;
  period_start: string;
  period_end: string;
  auto_summary?: string | null;
  content?: string | null;
}

export interface UpdateReviewInput {
  type?: ReviewType;
  period_start?: string;
  period_end?: string;
  auto_summary?: string | null;
  content?: string | null;
  status?: ReviewStatus;
}

export interface ReviewSummary {
  doneTasks: number;
  totalTasks: number;
  inboxCount: number;
  overdueCount: number;
  goals: { title: string; current: number; target: number | null }[];
}

export async function getReviews(): Promise<Review[]> {
  return select<Review>(
    `SELECT * FROM reviews
     WHERE deleted_at IS NULL
     ORDER BY period_start DESC`
  );
}

export async function getReviewsByType(type: ReviewType): Promise<Review[]> {
  return select<Review>(
    `SELECT * FROM reviews
     WHERE type = ? AND deleted_at IS NULL
     ORDER BY period_start DESC`,
    [type]
  );
}

export async function createReview(
  input: CreateReviewInput
): Promise<Review> {
  const result = await execute(
    `INSERT INTO reviews (type, period_start, period_end, auto_summary, content)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.type,
      input.period_start,
      input.period_end,
      input.auto_summary ?? null,
      input.content ?? null,
    ]
  );
  return (await selectOne<Review>(`SELECT * FROM reviews WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updateReview(
  id: number,
  input: UpdateReviewInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.type !== undefined) {
    fields.push("type = ?");
    values.push(input.type);
  }
  if (input.period_start !== undefined) {
    fields.push("period_start = ?");
    values.push(input.period_start);
  }
  if (input.period_end !== undefined) {
    fields.push("period_end = ?");
    values.push(input.period_end);
  }
  if (input.auto_summary !== undefined) {
    fields.push("auto_summary = ?");
    values.push(input.auto_summary);
  }
  if (input.content !== undefined) {
    fields.push("content = ?");
    values.push(input.content);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE reviews SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteReview(id: number): Promise<void> {
  await execute(
    `UPDATE reviews SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

/** 统计指定周期内的关键数据，用于复盘自动摘要 */
export async function generateReviewSummary(
  periodStart: string,
  periodEnd: string
): Promise<ReviewSummary> {
  const doneTasks = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM tasks
     WHERE plan_date BETWEEN ? AND ? AND status = 'done' AND deleted_at IS NULL`,
    [periodStart, periodEnd]
  );
  const totalTasks = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM tasks
     WHERE plan_date BETWEEN ? AND ? AND status != 'abandoned' AND deleted_at IS NULL`,
    [periodStart, periodEnd]
  );
  const inboxCount = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM notes
     WHERE status = 'inbox' AND deleted_at IS NULL`
  );
  const overdueCount = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM tasks
     WHERE due_date < ? AND status = 'todo' AND deleted_at IS NULL`,
    [periodEnd]
  );
  const goals = await select<{ title: string; current: number; target: number | null }>(
    `SELECT title, progress_current as current, progress_target as target
     FROM goals WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY period_type ASC, created_at ASC`
  );

  return {
    doneTasks: doneTasks?.c ?? 0,
    totalTasks: totalTasks?.c ?? 0,
    inboxCount: inboxCount?.c ?? 0,
    overdueCount: overdueCount?.c ?? 0,
    goals,
  };
}

/** 将结构化摘要格式化为文本 */
export function formatReviewSummary(s: ReviewSummary): string {
  const lines: string[] = [
    `任务：完成 ${s.doneTasks}/${s.totalTasks}`,
    `收件箱：${s.inboxCount} 条待整理`,
    `逾期：${s.overdueCount} 条待重新安排`,
  ];
  if (s.goals.length > 0) {
    lines.push("目标进度：");
    for (const g of s.goals) {
      const progress = g.target ? `${g.current}/${g.target}` : `${g.current}`;
      lines.push(`  · ${g.title} ${progress}`);
    }
  }
  return lines.join("\n");
}
