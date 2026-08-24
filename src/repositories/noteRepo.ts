// ============================================================
// 笔记数据访问层（收件箱 + 知识库同表，按 status 区分）
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import { invoke } from "@tauri-apps/api/core";
import type { LinkableNote, ResolvedNoteLink } from "@/lib/noteLinks";
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

export interface NoteLinkReference {
  noteId: number;
  title: string | null;
  linkText: string;
  available: boolean;
}

export interface SaveKnowledgeNoteInput {
  id?: number;
  title: string | null;
  content: string;
  subjectId: number | null;
  links: ResolvedNoteLink[];
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

export async function getNotesForLinking(): Promise<LinkableNote[]> {
  return select<LinkableNote>(
    `SELECT id, title FROM notes
     WHERE status = 'knowledge' AND title IS NOT NULL AND title != '' AND deleted_at IS NULL
     ORDER BY title, id`
  );
}

export async function getNoteLinksFrom(noteId: number): Promise<NoteLinkReference[]> {
  const rows = await select<{
    note_id: number;
    title: string | null;
    link_text: string;
    available: number;
  }>(
    `SELECT nl.target_note_id AS note_id, target.title, nl.link_text,
            CASE WHEN target.id IS NOT NULL AND target.deleted_at IS NULL THEN 1 ELSE 0 END AS available
     FROM note_links nl
     LEFT JOIN notes target ON target.id = nl.target_note_id
     WHERE nl.source_note_id = ?
     ORDER BY nl.id`,
    [noteId]
  );
  return rows.map((row) => ({
    noteId: row.note_id,
    title: row.title,
    linkText: row.link_text,
    available: row.available === 1,
  }));
}

export async function getNoteLinksTo(noteId: number): Promise<NoteLinkReference[]> {
  const rows = await select<{
    note_id: number;
    title: string | null;
    link_text: string;
  }>(
    `SELECT source.id AS note_id, source.title, nl.link_text
     FROM note_links nl
     JOIN notes source ON source.id = nl.source_note_id
     WHERE nl.target_note_id = ? AND source.deleted_at IS NULL
     ORDER BY source.updated_at DESC`,
    [noteId]
  );
  return rows.map((row) => ({
    noteId: row.note_id,
    title: row.title,
    linkText: row.link_text,
    available: true,
  }));
}

export async function saveKnowledgeNoteWithLinks(
  input: SaveKnowledgeNoteInput
): Promise<Note> {
  const result = await invoke<{ id: number }>("save_knowledge_note", { input });
  return (await getNoteById(result.id))!;
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
