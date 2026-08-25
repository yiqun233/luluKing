// ============================================================
// 复盘数据访问层（含自动摘要统计）
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import { format, subDays, differenceInDays } from "date-fns";
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
  /** 同周期周计划中的承诺任务完成数 */
  doneTasks: number;
  /** 同周期周计划中的承诺总数 */
  totalTasks: number;
  /** 尚未完成且尚未做去向决策的承诺数 */
  pendingCommitments: number;
  /** 上一个等长周期的完成数，用于环比 */
  prevDoneTasks: number;
  prevTotalTasks: number;
  inboxCount: number;
  overdueCount: number;
  goals: { title: string; current: number; target: number | null }[];
  habits: HabitSummary[];
}

export interface HabitSummary {
  title: string;
  /** 周期内打卡次数 */
  count: number;
  /** 周期内应打卡次数（daily 为周期天数，weekly 为 frequency_target × 周数） */
  target: number;
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

/** 周期天数（含首尾） */
export function periodDays(periodStart: string, periodEnd: string): number {
  return (
    differenceInDays(
      new Date(periodEnd + "T00:00:00"),
      new Date(periodStart + "T00:00:00")
    ) + 1
  );
}

/** 上一个等长周期（紧邻当前周期之前） */
export function prevPeriod(
  periodStart: string,
  periodEnd: string
): { start: string; end: string } {
  const days = periodDays(periodStart, periodEnd);
  const prevEnd = subDays(new Date(periodStart + "T00:00:00"), 1);
  const prevStart = subDays(prevEnd, days - 1);
  return {
    start: format(prevStart, "yyyy-MM-dd"),
    end: format(prevEnd, "yyyy-MM-dd"),
  };
}

/** 习惯在周期内的应打卡次数 */
function habitTarget(
  frequencyType: string,
  frequencyTarget: number,
  days: number
): number {
  if (frequencyType === "weekly") {
    return frequencyTarget * Math.max(1, Math.round(days / 7));
  }
  return days;
}

/** 统计指定周期内的关键数据，用于复盘自动摘要 */
export async function generateReviewSummary(
  periodStart: string,
  periodEnd: string
): Promise<ReviewSummary> {
  const doneTasks = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c
     FROM plan_tasks pt
     JOIN plans p ON p.id = pt.plan_id
     JOIN tasks t ON t.id = pt.task_id
     WHERE p.type = 'week' AND p.period_start = ? AND p.period_end = ?
       AND p.deleted_at IS NULL AND t.deleted_at IS NULL
       AND (t.status = 'done' OR pt.resolution = 'completed')`,
    [periodStart, periodEnd]
  );
  const totalTasks = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c
     FROM plan_tasks pt
     JOIN plans p ON p.id = pt.plan_id
     JOIN tasks t ON t.id = pt.task_id
     WHERE p.type = 'week' AND p.period_start = ? AND p.period_end = ?
       AND p.deleted_at IS NULL AND t.deleted_at IS NULL`,
    [periodStart, periodEnd]
  );
  const pendingCommitments = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c
     FROM plan_tasks pt
     JOIN plans p ON p.id = pt.plan_id
     JOIN tasks t ON t.id = pt.task_id
     WHERE p.type = 'week' AND p.period_start = ? AND p.period_end = ?
       AND p.deleted_at IS NULL AND t.deleted_at IS NULL
       AND pt.resolution IS NULL AND t.status = 'todo'`,
    [periodStart, periodEnd]
  );
  const prev = prevPeriod(periodStart, periodEnd);
  const prevDoneTasks = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c
     FROM plan_tasks pt
     JOIN plans p ON p.id = pt.plan_id
     JOIN tasks t ON t.id = pt.task_id
     WHERE p.type = 'week' AND p.period_start = ? AND p.period_end = ?
       AND p.deleted_at IS NULL AND t.deleted_at IS NULL
       AND (t.status = 'done' OR pt.resolution = 'completed')`,
    [prev.start, prev.end]
  );
  const prevTotalTasks = await selectOne<{ c: number }>(
    `SELECT COUNT(*) as c
     FROM plan_tasks pt
     JOIN plans p ON p.id = pt.plan_id
     JOIN tasks t ON t.id = pt.task_id
     WHERE p.type = 'week' AND p.period_start = ? AND p.period_end = ?
       AND p.deleted_at IS NULL AND t.deleted_at IS NULL`,
    [prev.start, prev.end]
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

  // 习惯打卡：LEFT JOIN 保证周期内零打卡的习惯也出现（正是要暴露的异常）
  const habitRows = await select<{
    title: string;
    frequency_type: string;
    frequency_target: number;
    count: number;
  }>(
    `SELECT h.title, h.frequency_type, h.frequency_target,
            COUNT(l.id) as count
     FROM habits h
     LEFT JOIN habit_logs l
       ON l.habit_id = h.id AND l.date BETWEEN ? AND ?
     WHERE h.status = 'active' AND h.deleted_at IS NULL
     GROUP BY h.id
     ORDER BY h.created_at ASC`,
    [periodStart, periodEnd]
  );
  const days = periodDays(periodStart, periodEnd);
  const habits: HabitSummary[] = habitRows.map((r) => ({
    title: r.title,
    count: r.count,
    target: habitTarget(r.frequency_type, r.frequency_target, days),
  }));

  return {
    doneTasks: doneTasks?.c ?? 0,
    totalTasks: totalTasks?.c ?? 0,
    pendingCommitments: pendingCommitments?.c ?? 0,
    prevDoneTasks: prevDoneTasks?.c ?? 0,
    prevTotalTasks: prevTotalTasks?.c ?? 0,
    inboxCount: inboxCount?.c ?? 0,
    overdueCount: overdueCount?.c ?? 0,
    goals,
    habits,
  };
}

/** 完成率，分母为 0 时返回 null（无从判断，不标异常） */
function rate(done: number, total: number): number | null {
  return total > 0 ? done / total : null;
}

/**
 * 将结构化摘要格式化为文本。
 * 不只罗列数字：带上周期对比与异常标记，让"该关注什么"直接可见（业务设计 4.8.3）。
 */
export function formatReviewSummary(s: ReviewSummary): string {
  // 任务：本期 vs 上期完成率
  const cur = rate(s.doneTasks, s.totalTasks);
  const prev = rate(s.prevDoneTasks, s.prevTotalTasks);
  let taskLine = `周计划承诺：完成 ${s.doneTasks}/${s.totalTasks}`;
  if (s.prevTotalTasks > 0) {
    taskLine += `（上期 ${s.prevDoneTasks}/${s.prevTotalTasks}`;
    if (cur != null && prev != null) {
      if (cur < prev) taskLine += " ↓ 下降";
      else if (cur > prev) taskLine += " ↑ 提升";
      else taskLine += " 持平";
    }
    taskLine += "）";
  }
  if (s.pendingCommitments > 0) taskLine += `，待决 ${s.pendingCommitments}`;

  const lines: string[] = [taskLine];

  if (s.habits.length > 0) {
    lines.push("习惯：");
    for (const h of s.habits) {
      const gap = h.target - h.count;
      const mark =
        gap <= 0 ? " ✓" : h.count === 0 ? " ⚠ 本期零打卡" : ` ⚠ 差 ${gap} 次`;
      lines.push(`  · ${h.title} ${h.count}/${h.target}${mark}`);
    }
  }

  if (s.goals.length > 0) {
    lines.push("目标进度：");
    for (const g of s.goals) {
      if (g.target) {
        // 目标完成率不足一半即提醒，避免临期才发现
        const mark = g.current / g.target < 0.5 ? " ⚠ 落后" : "";
        lines.push(`  · ${g.title} ${g.current}/${g.target}${mark}`);
      } else {
        lines.push(`  · ${g.title} ${g.current}`);
      }
    }
  }

  lines.push(`收件箱：${s.inboxCount} 条待整理`);
  lines.push(`逾期：${s.overdueCount} 条待重新安排`);
  return lines.join("\n");
}
