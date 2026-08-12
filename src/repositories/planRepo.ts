// ============================================================
// 周期计划数据访问层
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type { Plan, PlanType } from "@/types/entities";

export interface CreatePlanInput {
  type: PlanType;
  period_start: string;
  period_end: string;
  content?: string | null;
}

export interface UpdatePlanInput {
  type?: PlanType;
  period_start?: string;
  period_end?: string;
  content?: string | null;
}

export async function getPlans(): Promise<Plan[]> {
  return select<Plan>(
    `SELECT * FROM plans
     WHERE deleted_at IS NULL
     ORDER BY period_start DESC`
  );
}

export async function getPlansByType(type: PlanType): Promise<Plan[]> {
  return select<Plan>(
    `SELECT * FROM plans
     WHERE type = ? AND deleted_at IS NULL
     ORDER BY period_start DESC`,
    [type]
  );
}

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  const result = await execute(
    `INSERT INTO plans (type, period_start, period_end, content)
     VALUES (?, ?, ?, ?)`,
    [input.type, input.period_start, input.period_end, input.content ?? null]
  );
  return (await selectOne<Plan>(`SELECT * FROM plans WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updatePlan(
  id: number,
  input: UpdatePlanInput
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
  if (input.content !== undefined) {
    fields.push("content = ?");
    values.push(input.content);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE plans SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deletePlan(id: number): Promise<void> {
  await execute(
    `UPDATE plans SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}
