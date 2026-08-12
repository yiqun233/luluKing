// ============================================================
// 主题数据访问层（知识库骨架）
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type { Subject } from "@/types/entities";

export async function getSubjects(): Promise<Subject[]> {
  return select<Subject>(
    `SELECT * FROM subjects
     WHERE deleted_at IS NULL
     ORDER BY sort_order ASC, id ASC`
  );
}

export async function createSubject(name: string): Promise<Subject> {
  const result = await execute(
    `INSERT INTO subjects (name) VALUES (?)`,
    [name]
  );
  return (await selectOne<Subject>(`SELECT * FROM subjects WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updateSubject(id: number, name: string): Promise<void> {
  await execute(
    `UPDATE subjects SET name = ?, updated_at = datetime('now') WHERE id = ?`,
    [name, id]
  );
}

export async function deleteSubject(id: number): Promise<void> {
  await execute(
    `UPDATE subjects SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}
