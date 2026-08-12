// ============================================================
// 笔记数据访问层（收件箱 + 知识库同表，按 status 区分）
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type { Note, NoteStatus, NoteSource } from "@/types/entities";

export interface CreateNoteInput {
  content: string;
  title?: string | null;
  status?: NoteStatus;
  subject_id?: number | null;
  source?: NoteSource;
}

export interface UpdateNoteInput {
  title?: string | null;
  content?: string;
  status?: NoteStatus;
  subject_id?: number | null;
  related_goal_id?: number | null;
  related_project_id?: number | null;
}

export async function getInboxNotes(): Promise<Note[]> {
  return select<Note>(
    `SELECT * FROM notes
     WHERE status = 'inbox' AND deleted_at IS NULL
     ORDER BY created_at DESC`
  );
}

export async function getKnowledgeNotes(): Promise<Note[]> {
  return select<Note>(
    `SELECT * FROM notes
     WHERE status = 'knowledge' AND deleted_at IS NULL
     ORDER BY updated_at DESC`
  );
}

export async function getNotesBySubject(
  subjectId: number
): Promise<Note[]> {
  return select<Note>(
    `SELECT * FROM notes
     WHERE subject_id = ? AND status = 'knowledge' AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [subjectId]
  );
}

export async function getNoteById(id: number): Promise<Note | null> {
  return selectOne<Note>(
    `SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const result = await execute(
    `INSERT INTO notes (title, content, status, subject_id, source)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.title ?? null,
      input.content,
      input.status ?? "inbox",
      input.subject_id ?? null,
      input.source ?? "inbox",
    ]
  );
  return (await selectOne<Note>(`SELECT * FROM notes WHERE id = ?`, [
    result.lastInsertId,
  ]))!;
}

export async function updateNote(
  id: number,
  input: UpdateNoteInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.content !== undefined) {
    fields.push("content = ?");
    values.push(input.content);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.subject_id !== undefined) {
    fields.push("subject_id = ?");
    values.push(input.subject_id);
  }
  if (input.related_goal_id !== undefined) {
    fields.push("related_goal_id = ?");
    values.push(input.related_goal_id);
  }
  if (input.related_project_id !== undefined) {
    fields.push("related_project_id = ?");
    values.push(input.related_project_id);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE notes SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteNote(id: number): Promise<void> {
  await execute(
    `UPDATE notes SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}
