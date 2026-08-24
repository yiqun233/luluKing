// ============================================================
// 标签数据访问层（标签 CRUD + taggables 多态关联）
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import { invoke } from "@tauri-apps/api/core";
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

export interface TagSliceItem {
  type: TaggableType;
  id: number;
  title: string;
  subtitle: string;
  noteStatus?: "inbox" | "knowledge";
  eventDate?: string;
  reviewType?: "week" | "month";
}

// ========== 标签 CRUD ==========

export async function getTags(): Promise<Tag[]> {
  return select<Tag>(
    `SELECT * FROM tags
     WHERE deleted_at IS NULL AND status = 'active'
     ORDER BY name`
  );
}

export async function getTagsForManagement(): Promise<Tag[]> {
  return select<Tag>(
    `SELECT * FROM tags
     WHERE deleted_at IS NULL
     ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, name`
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

export async function mergeTags(sourceTagId: number, targetTagId: number): Promise<void> {
  await invoke("merge_tags", { sourceTagId, targetTagId });
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

export async function getTagSlice(tagId: number): Promise<TagSliceItem[]> {
  const [tasks, projects, goals, notes, habits, events, reviews] = await Promise.all([
    select<{ id: number; title: string; status: string }>(
      `SELECT t.id, t.title, t.status FROM taggables tg
       JOIN tasks t ON t.id = tg.taggable_id
       WHERE tg.tag_id = ? AND tg.taggable_type = 'task' AND t.deleted_at IS NULL
       ORDER BY t.updated_at DESC`,
      [tagId]
    ),
    select<{ id: number; title: string; status: string }>(
      `SELECT p.id, p.title, p.status FROM taggables tg
       JOIN projects p ON p.id = tg.taggable_id
       WHERE tg.tag_id = ? AND tg.taggable_type = 'project' AND p.deleted_at IS NULL
       ORDER BY p.updated_at DESC`,
      [tagId]
    ),
    select<{ id: number; title: string; status: string }>(
      `SELECT g.id, g.title, g.status FROM taggables tg
       JOIN goals g ON g.id = tg.taggable_id
       WHERE tg.tag_id = ? AND tg.taggable_type = 'goal' AND g.deleted_at IS NULL
       ORDER BY g.updated_at DESC`,
      [tagId]
    ),
    select<{
      id: number;
      title: string | null;
      content: string;
      status: "inbox" | "knowledge";
    }>(
      `SELECT n.id, n.title, n.content, n.status FROM taggables tg
       JOIN notes n ON n.id = tg.taggable_id
       WHERE tg.tag_id = ? AND tg.taggable_type = 'note' AND n.deleted_at IS NULL
       ORDER BY n.updated_at DESC`,
      [tagId]
    ),
    select<{ id: number; title: string; status: string }>(
      `SELECT h.id, h.title, h.status FROM taggables tg
       JOIN habits h ON h.id = tg.taggable_id
       WHERE tg.tag_id = ? AND tg.taggable_type = 'habit' AND h.deleted_at IS NULL
       ORDER BY h.updated_at DESC`,
      [tagId]
    ),
    select<{ id: number; title: string; date: string; start_time: string | null }>(
      `SELECT e.id, e.title, e.date, e.start_time FROM taggables tg
       JOIN events e ON e.id = tg.taggable_id
       WHERE tg.tag_id = ? AND tg.taggable_type = 'event' AND e.deleted_at IS NULL
       ORDER BY e.date DESC, e.start_time DESC`,
      [tagId]
    ),
    select<{
      id: number;
      type: "week" | "month";
      period_start: string;
      status: string;
    }>(
      `SELECT r.id, r.type, r.period_start, r.status FROM taggables tg
       JOIN reviews r ON r.id = tg.taggable_id
       WHERE tg.tag_id = ? AND tg.taggable_type = 'review' AND r.deleted_at IS NULL
       ORDER BY r.period_start DESC`,
      [tagId]
    ),
  ]);

  return [
    ...tasks.map((task) => ({
      type: "task" as const,
      id: task.id,
      title: task.title,
      subtitle: task.status === "done" ? "已完成" : "任务",
    })),
    ...projects.map((project) => ({
      type: "project" as const,
      id: project.id,
      title: project.title,
      subtitle: project.status,
    })),
    ...goals.map((goal) => ({
      type: "goal" as const,
      id: goal.id,
      title: goal.title,
      subtitle: goal.status,
    })),
    ...notes.map((note) => ({
      type: "note" as const,
      id: note.id,
      title: note.title || note.content.slice(0, 30) || "无标题",
      subtitle: note.content.slice(0, 60),
      noteStatus: note.status,
    })),
    ...habits.map((habit) => ({
      type: "habit" as const,
      id: habit.id,
      title: habit.title,
      subtitle: habit.status,
    })),
    ...events.map((event) => ({
      type: "event" as const,
      id: event.id,
      title: event.title,
      subtitle: [event.date, event.start_time].filter(Boolean).join(" · "),
      eventDate: event.date,
    })),
    ...reviews.map((review) => ({
      type: "review" as const,
      id: review.id,
      title: `${review.type === "week" ? "周" : "月"}复盘 · ${review.period_start}`,
      subtitle: review.status,
      reviewType: review.type,
    })),
  ];
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
