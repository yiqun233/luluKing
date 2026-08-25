// ============================================================
// 周计划承诺数据访问层
// ============================================================

import { invoke } from "@tauri-apps/api/core";
import { select, selectOne } from "@/db/client";
import type { Plan, PlanTaskCommitment, PlanTaskResolution, Task } from "@/types/entities";

export interface SaveWeekPlanInput {
  id?: number;
  period_start: string;
  period_end: string;
  content?: string | null;
  task_ids: number[];
}

export interface ResolvePlanTaskInput {
  plan_id: number;
  task_id: number;
  resolution: PlanTaskResolution;
  /** 仅“推到下期”时填写，下周第一天。 */
  next_period_start?: string;
}

export async function getPlanTaskCommitments(
  planId: number
): Promise<PlanTaskCommitment[]> {
  return select<PlanTaskCommitment>(
    `SELECT t.*, pt.plan_id, pt.task_id, pt.resolution, pt.resolved_at,
            p.period_start AS plan_period_start, p.period_end AS plan_period_end
     FROM plan_tasks pt
     JOIN tasks t ON t.id = pt.task_id
     JOIN plans p ON p.id = pt.plan_id
     WHERE pt.plan_id = ? AND p.deleted_at IS NULL AND t.deleted_at IS NULL
     ORDER BY pt.resolution IS NOT NULL, t.is_key DESC, t.due_date ASC, t.created_at ASC`,
    [planId]
  );
}

/** 尚未安排且未被任何有效周计划承诺的待办任务。 */
export async function getAvailableWeekPlanTasks(): Promise<Task[]> {
  return select<Task>(
    `SELECT t.*
     FROM tasks t
     WHERE t.status = 'todo' AND t.plan_date IS NULL AND t.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM plan_tasks pt
         JOIN plans p ON p.id = pt.plan_id
         WHERE pt.task_id = t.id AND pt.resolution IS NULL AND p.deleted_at IS NULL
       )
     ORDER BY t.is_key DESC, t.due_date ASC, t.created_at ASC`
  );
}

/** 与周复盘完全同周期的承诺；保留已决项，便于回看去向。 */
export async function getReviewPlanTaskCommitments(
  periodStart: string,
  periodEnd: string
): Promise<PlanTaskCommitment[]> {
  return select<PlanTaskCommitment>(
    `SELECT t.*, pt.plan_id, pt.task_id, pt.resolution, pt.resolved_at,
            p.period_start AS plan_period_start, p.period_end AS plan_period_end
     FROM plan_tasks pt
     JOIN tasks t ON t.id = pt.task_id
     JOIN plans p ON p.id = pt.plan_id
     WHERE p.type = 'week' AND p.period_start = ? AND p.period_end = ?
       AND p.deleted_at IS NULL AND t.deleted_at IS NULL
     ORDER BY pt.resolution IS NOT NULL, t.is_key DESC, t.due_date ASC, t.created_at ASC`,
    [periodStart, periodEnd]
  );
}

/** 周计划和承诺关系必须同事务保存，避免半保存。 */
export async function saveWeekPlan(input: SaveWeekPlanInput): Promise<Plan> {
  const result = await invoke<{ id: number }>("save_week_plan", { input });
  const plan = await selectOne<Plan>(`SELECT * FROM plans WHERE id = ?`, [result.id]);
  if (!plan) throw new Error("周计划保存后无法读取");
  return plan;
}

/** 在事务中完成任务、顺延、回收或放弃承诺。 */
export async function resolvePlanTask(input: ResolvePlanTaskInput): Promise<void> {
  await invoke("resolve_plan_task", { input });
}
