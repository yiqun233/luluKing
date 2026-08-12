// ============================================================
// 项目与素材数据访问层
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type {
  Project,
  ProjectType,
  ProjectStatus,
  Material,
  MaterialType,
} from "@/types/entities";

// ---------- 项目 ----------

export interface CreateProjectInput {
  title: string;
  type: ProjectType;
  goal_id?: number | null;
  notes?: string | null;
}

export interface UpdateProjectInput {
  title?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  is_focus?: number; // 0 | 1
  progress_override?: number | null;
  goal_id?: number | null;
  notes?: string | null;
}

export async function getProjects(): Promise<Project[]> {
  return select<Project>(
    `SELECT * FROM projects
     WHERE deleted_at IS NULL
     ORDER BY is_focus DESC,
       CASE status WHEN 'active' THEN 0 WHEN 'inactive' THEN 1 WHEN 'done' THEN 2 WHEN 'archived' THEN 3 ELSE 4 END,
       created_at ASC`
  );
}

export async function getActiveProjects(): Promise<Project[]> {
  return select<Project>(
    `SELECT * FROM projects
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY is_focus DESC, created_at ASC`
  );
}

export async function getProjectsByGoal(goalId: number): Promise<Project[]> {
  return select<Project>(
    `SELECT * FROM projects
     WHERE goal_id = ? AND deleted_at IS NULL
     ORDER BY is_focus DESC, created_at ASC`,
    [goalId]
  );
}

export async function getProjectById(id: number): Promise<Project | null> {
  return selectOne<Project>(`SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL`, [
    id,
  ]);
}

export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  const result = await execute(
    `INSERT INTO projects (title, type, goal_id, notes)
     VALUES (?, ?, ?, ?)`,
    [input.title, input.type, input.goal_id ?? null, input.notes ?? null]
  );
  return (await selectOne<Project>(`SELECT * FROM projects WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updateProject(
  id: number,
  input: UpdateProjectInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.type !== undefined) {
    fields.push("type = ?");
    values.push(input.type);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.is_focus !== undefined) {
    fields.push("is_focus = ?");
    values.push(input.is_focus);
  }
  if (input.progress_override !== undefined) {
    fields.push("progress_override = ?");
    values.push(input.progress_override);
  }
  if (input.goal_id !== undefined) {
    fields.push("goal_id = ?");
    values.push(input.goal_id);
  }
  if (input.notes !== undefined) {
    fields.push("notes = ?");
    values.push(input.notes);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteProject(id: number): Promise<void> {
  await execute(
    `UPDATE projects SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

// ---------- 素材（学习型项目的子资源） ----------

export interface CreateMaterialInput {
  project_id: number;
  type: MaterialType;
  title: string;
  author?: string | null;
  pages?: number | null;
}

export interface UpdateMaterialInput {
  type?: MaterialType;
  title?: string;
  author?: string | null;
  pages?: number | null;
  progress?: number;
  notes?: string | null;
}

export async function getMaterialsByProject(
  projectId: number
): Promise<Material[]> {
  return select<Material>(
    `SELECT * FROM materials
     WHERE project_id = ? AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [projectId]
  );
}

export async function createMaterial(
  input: CreateMaterialInput
): Promise<Material> {
  const result = await execute(
    `INSERT INTO materials (project_id, type, title, author, pages, progress)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [
      input.project_id,
      input.type,
      input.title,
      input.author ?? null,
      input.pages ?? null,
    ]
  );
  return (await selectOne<Material>(`SELECT * FROM materials WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updateMaterial(
  id: number,
  input: UpdateMaterialInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.type !== undefined) {
    fields.push("type = ?");
    values.push(input.type);
  }
  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.author !== undefined) {
    fields.push("author = ?");
    values.push(input.author);
  }
  if (input.pages !== undefined) {
    fields.push("pages = ?");
    values.push(input.pages);
  }
  if (input.progress !== undefined) {
    fields.push("progress = ?");
    values.push(input.progress);
  }
  if (input.notes !== undefined) {
    fields.push("notes = ?");
    values.push(input.notes);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE materials SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteMaterial(id: number): Promise<void> {
  await execute(
    `UPDATE materials SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}
