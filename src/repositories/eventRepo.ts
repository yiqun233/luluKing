// ============================================================
// 日程事件数据访问层
// ============================================================

import { execute, select, selectOne } from "@/db/client";
import type { CalendarEvent, EventType } from "@/types/entities";

export interface CreateEventInput {
  title: string;
  type?: EventType;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  task_id?: number | null;
}

export interface UpdateEventInput {
  title?: string;
  date?: string;
  start_time?: string | null;
  end_time?: string | null;
}

// 按日期范围查询（周视图用）
export async function getEventsByDateRange(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  return select<CalendarEvent>(
    `SELECT * FROM events
     WHERE date >= ? AND date <= ? AND deleted_at IS NULL
     ORDER BY date ASC, start_time ASC NULLS LAST, id ASC`,
    [startDate, endDate]
  );
}

// 单日事件（今日视图用）
export async function getEventsByDate(date: string): Promise<CalendarEvent[]> {
  return select<CalendarEvent>(
    `SELECT * FROM events
     WHERE date = ? AND deleted_at IS NULL
     ORDER BY start_time ASC NULLS LAST, id ASC`,
    [date]
  );
}

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const result = await execute(
    `INSERT INTO events (title, type, date, start_time, end_time, task_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.type ?? "independent",
      input.date,
      input.start_time ?? null,
      input.end_time ?? null,
      input.task_id ?? null,
    ]
  );
  const event = await selectOne<CalendarEvent>(
    `SELECT * FROM events WHERE id = ?`,
    [result.lastInsertId]
  );
  return event!;
}

export async function updateEvent(
  id: number,
  input: UpdateEventInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(input.title);
  }
  if (input.date !== undefined) {
    fields.push("date = ?");
    values.push(input.date);
  }
  if (input.start_time !== undefined) {
    fields.push("start_time = ?");
    values.push(input.start_time);
  }
  if (input.end_time !== undefined) {
    fields.push("end_time = ?");
    values.push(input.end_time);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await execute(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteEvent(id: number): Promise<void> {
  await execute(
    `UPDATE events SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
}
