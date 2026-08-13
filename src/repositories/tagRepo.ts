// ============================================================
// 标签数据访问层（标签 CRUD + taggables 多态关联）
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type { Tag, TaggableType, TagStatus } from "@/types/entities";

export interface CreateTagInput {
  name: string;
  color?: string | null;
}

export interface UpdateTagInput {
  name?: string;
  color?: string | null;
  status?: TagStatus;
}

// ========== 标签 CRUD ==========

export async function getTags(): Promise<Tag[]> {
  return select<Tag>(
    `SELECT * FROM tags
     WHERE deleted_at IS NULL AND status = 'active'
     ORDER BY name`
  );
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const result = await execute(
    `INSERT INTO tags (name, color) VALUES (?, ?)`,
    [input.name, input.color ?? null]
  );
  return (await selectOne<Tag>(`SELECT * FROM tags WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updateTag(
  id: number,
  input: UpdateTagInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.color !== undefined) {
    fields.push("color = ?");
    values.push(input.color);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE tags SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteTag(id: number): Promise<void> {
  await execute(
    `UPDATE tags SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

// ========== 多态关联 taggables ==========

/** 获取某实体已打的标签 */
export async function getTagsFor(
  taggableType: TaggableType,
  taggableId: number
): Promise<Tag[]> {
  return select<Tag>(
    `SELECT t.* FROM tags t
     JOIN taggables tg ON tg.tag_id = t.id
     WHERE tg.taggable_type = ? AND tg.taggable_id = ? AND t.deleted_at IS NULL
     ORDER BY t.name`,
    [taggableType, taggableId]
  );
}

/** 查某标签下的实体 id 列表（切片视图用） */
export async function getTaggedIds(
  taggableType: TaggableType,
  tagId: number
): Promise<number[]> {
  const rows = await select<{ taggable_id: number }>(
    `SELECT taggable_id FROM taggables WHERE taggable_type = ? AND tag_id = ?`,
    [taggableType, tagId]
  );
  return rows.map((r) => r.taggable_id);
}

/**
 * 设置某实体的标签（全量替换）。
 * 先删后插，逐条执行；本地单用户场景可接受非原子。
 */
export async function setTags(
  taggableType: TaggableType,
  taggableId: number,
  tagIds: number[]
): Promise<void> {
  await execute(
    `DELETE FROM taggables WHERE taggable_type = ? AND taggable_id = ?`,
    [taggableType, taggableId]
  );
  for (const tagId of tagIds) {
    await execute(
      `INSERT OR IGNORE INTO taggables (tag_id, taggable_type, taggable_id) VALUES (?, ?, ?)`,
      [tagId, taggableType, taggableId]
    );
  }
}
