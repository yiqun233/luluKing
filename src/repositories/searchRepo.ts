// ============================================================
// 全局搜索数据访问层（SQLite FTS5）
// ============================================================

import { select } from "@/db/client";

export type SearchResultType =
  | "task"
  | "note"
  | "project"
  | "goal"
  | "habit"
  | "event"
  | "review"
  | "tag";

export type SearchStatus =
  | "todo"
  | "done"
  | "active"
  | "archived"
  | "draft"
  | "skipped"
  | "inbox";

export interface SearchFilters {
  types: SearchResultType[];
  tag: string | null;
  status: SearchStatus | null;
  text: string;
}

export interface SearchResult {
  type: SearchResultType;
  id: number;
  title: string;
  subtitle?: string;
  noteStatus?: "inbox" | "knowledge";
  eventDate?: string;
  reviewType?: "week" | "month";
}

const SEARCH_TYPES: SearchResultType[] = [
  "task",
  "note",
  "project",
  "goal",
  "habit",
  "event",
  "review",
  "tag",
];

const TYPE_ALIASES: Record<string, SearchResultType> = {
  task: "task",
  tasks: "task",
  "任务": "task",
  note: "note",
  notes: "note",
  "笔记": "note",
  "知识": "note",
  project: "project",
  projects: "project",
  "项目": "project",
  goal: "goal",
  goals: "goal",
  "目标": "goal",
  habit: "habit",
  habits: "habit",
  "习惯": "habit",
  event: "event",
  events: "event",
  calendar: "event",
  "日程": "event",
  "事件": "event",
  review: "review",
  reviews: "review",
  "复盘": "review",
  tag: "tag",
  tags: "tag",
  "标签": "tag",
};

const STATUS_ALIASES: Record<string, SearchStatus> = {
  todo: "todo",
  "未完成": "todo",
  "待办": "todo",
  done: "done",
  "已完成": "done",
  active: "active",
  "进行中": "active",
  archived: "archived",
  "已归档": "archived",
  draft: "draft",
  "草稿": "draft",
  skipped: "skipped",
  "已跳过": "skipped",
  inbox: "inbox",
  "收件箱": "inbox",
};

const STATUS_SQL: Partial<
  Record<SearchResultType, Partial<Record<SearchStatus, string>>>
> = {
  task: { todo: "status = 'todo'", done: "status = 'done'" },
  note: { inbox: "status = 'inbox'" },
  project: {
    active: "status = 'active'",
    done: "status = 'done'",
    archived: "status = 'archived'",
  },
  goal: { active: "status = 'active'", done: "status = 'done'" },
  habit: { active: "status = 'active'", archived: "status = 'archived'" },
  review: {
    done: "status = 'done'",
    draft: "status = 'draft'",
    skipped: "status = 'skipped'",
  },
};

const LIMIT_PER_TYPE = 20;

export function parseSearchQuery(rawQuery: string): SearchFilters {
  const types: SearchResultType[] = [];
  const terms: string[] = [];
  let tag: string | null = null;
  let status: SearchStatus | null = null;

  for (const token of rawQuery.trim().split(/\s+/)) {
    if (!token) continue;
    const separator = token.indexOf(":");
    if (separator === -1) {
      terms.push(token);
      continue;
    }

    const key = token.slice(0, separator).toLowerCase();
    const value = token.slice(separator + 1);
    const type = key === "type" ? TYPE_ALIASES[value.toLowerCase()] : undefined;
    const parsedStatus =
      key === "status" ? STATUS_ALIASES[value.toLowerCase()] : undefined;

    if (type) {
      if (!types.includes(type)) types.push(type);
    } else if (key === "tag" && value) {
      tag = value;
    } else if (parsedStatus) {
      status = parsedStatus;
    } else {
      terms.push(token);
    }
  }

  return { types, tag, status, text: terms.join(" ") };
}

function hasSearchCriteria(filters: SearchFilters): boolean {
  return (
    filters.text.length > 0 ||
    filters.types.length > 0 ||
    filters.tag !== null ||
    filters.status !== null
  );
}

function toFtsQuery(text: string): string {
  const terms = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  return terms.map((term) => `${term}*`).join(" AND ");
}

function buildWhere(
  type: SearchResultType,
  alias: string,
  filters: SearchFilters
): { where: string; bindValues: unknown[] } {
  const clauses = [`${alias}.deleted_at IS NULL`];
  const bindValues: unknown[] = [];

  if (filters.text) {
    const ftsQuery = toFtsQuery(filters.text);
    if (ftsQuery) {
      clauses.push(`EXISTS (
        SELECT 1 FROM search_fts
        WHERE entity_type = ?
          AND entity_id = ${alias}.id
          AND search_fts MATCH ?
      )`);
      bindValues.push(type, ftsQuery);
    } else {
      clauses.push("1 = 0");
    }
  }

  if (filters.status) {
    const statusCondition = STATUS_SQL[type]?.[filters.status];
    clauses.push(statusCondition ?? "1 = 0");
  }

  if (filters.tag && type !== "tag") {
    clauses.push(`EXISTS (
      SELECT 1
      FROM taggables tg
      JOIN tags search_tag ON search_tag.id = tg.tag_id
      WHERE tg.taggable_type = ?
        AND tg.taggable_id = ${alias}.id
        AND search_tag.name = ?
        AND search_tag.status = 'active'
        AND search_tag.deleted_at IS NULL
    )`);
    bindValues.push(type, filters.tag);
  }

  return { where: clauses.join(" AND "), bindValues };
}

function statusLabel(status: string): string {
  return (
    {
      todo: "未完成",
      done: "已完成",
      abandoned: "已放弃",
      active: "进行中",
      inactive: "未启动",
      paused: "暂停",
      archived: "已归档",
      draft: "草稿",
      skipped: "已跳过",
      inbox: "收件箱",
      knowledge: "知识库",
    }[status] ?? status
  );
}

function sortByRelevance(results: SearchResult[], text: string): SearchResult[] {
  const normalized = text.toLocaleLowerCase();
  const score = (result: SearchResult) => {
    const title = result.title.toLocaleLowerCase();
    if (!normalized || title === normalized) return 0;
    if (title.startsWith(normalized)) return 1;
    if (title.includes(normalized)) return 2;
    return 3;
  };

  return [...results].sort((left, right) => score(left) - score(right));
}

async function searchTasks(filters: SearchFilters): Promise<SearchResult[]> {
  const { where, bindValues } = buildWhere("task", "t", filters);
  const rows = await select<{
    id: number;
    title: string;
    status: string;
    plan_date: string | null;
    due_date: string | null;
  }>(
    `SELECT t.id, t.title, t.status, t.plan_date, t.due_date
     FROM tasks t WHERE ${where}
     ORDER BY t.updated_at DESC LIMIT ?`,
    [...bindValues, LIMIT_PER_TYPE]
  );
  return rows.map((task) => ({
    type: "task",
    id: task.id,
    title: task.title,
    subtitle: [
      statusLabel(task.status),
      task.plan_date ? `计划 ${task.plan_date}` : null,
      task.due_date ? `截止 ${task.due_date}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));
}

async function searchNotes(filters: SearchFilters): Promise<SearchResult[]> {
  const { where, bindValues } = buildWhere("note", "n", filters);
  const rows = await select<{
    id: number;
    title: string | null;
    content: string;
    status: "inbox" | "knowledge";
  }>(
    `SELECT n.id, n.title, n.content, n.status
     FROM notes n WHERE ${where}
     ORDER BY n.updated_at DESC LIMIT ?`,
    [...bindValues, LIMIT_PER_TYPE]
  );
  return rows.map((note) => ({
    type: "note",
    id: note.id,
    title: note.title || note.content.slice(0, 30) || "无标题",
    subtitle: `${statusLabel(note.status)} · ${note.content.slice(0, 60)}`,
    noteStatus: note.status,
  }));
}

async function searchProjects(filters: SearchFilters): Promise<SearchResult[]> {
  const { where, bindValues } = buildWhere("project", "p", filters);
  const rows = await select<{ id: number; title: string; type: string; status: string }>(
    `SELECT p.id, p.title, p.type, p.status
     FROM projects p WHERE ${where}
     ORDER BY p.updated_at DESC LIMIT ?`,
    [...bindValues, LIMIT_PER_TYPE]
  );
  return rows.map((project) => ({
    type: "project",
    id: project.id,
    title: project.title,
    subtitle: `${project.type === "study" ? "学习项目" : "交付项目"} · ${statusLabel(project.status)}`,
  }));
}

async function searchGoals(filters: SearchFilters): Promise<SearchResult[]> {
  const { where, bindValues } = buildWhere("goal", "g", filters);
  const rows = await select<{
    id: number;
    title: string;
    period_value: string | null;
    status: string;
  }>(
    `SELECT g.id, g.title, g.period_value, g.status
     FROM goals g WHERE ${where}
     ORDER BY g.updated_at DESC LIMIT ?`,
    [...bindValues, LIMIT_PER_TYPE]
  );
  return rows.map((goal) => ({
    type: "goal",
    id: goal.id,
    title: goal.title,
    subtitle: [goal.period_value, statusLabel(goal.status)].filter(Boolean).join(" · "),
  }));
}

async function searchHabits(filters: SearchFilters): Promise<SearchResult[]> {
  const { where, bindValues } = buildWhere("habit", "h", filters);
  const rows = await select<{
    id: number;
    title: string;
    frequency_type: string;
    status: string;
  }>(
    `SELECT h.id, h.title, h.frequency_type, h.status
     FROM habits h WHERE ${where}
     ORDER BY h.updated_at DESC LIMIT ?`,
    [...bindValues, LIMIT_PER_TYPE]
  );
  return rows.map((habit) => ({
    type: "habit",
    id: habit.id,
    title: habit.title,
    subtitle: `${habit.frequency_type === "weekly" ? "每周" : "每日"} · ${statusLabel(habit.status)}`,
  }));
}

async function searchEvents(filters: SearchFilters): Promise<SearchResult[]> {
  const { where, bindValues } = buildWhere("event", "e", filters);
  const rows = await select<{
    id: number;
    title: string;
    date: string;
    start_time: string | null;
  }>(
    `SELECT e.id, e.title, e.date, e.start_time
     FROM events e WHERE ${where}
     ORDER BY e.date DESC, e.start_time DESC LIMIT ?`,
    [...bindValues, LIMIT_PER_TYPE]
  );
  return rows.map((event) => ({
    type: "event",
    id: event.id,
    title: event.title,
    subtitle: [event.date, event.start_time].filter(Boolean).join(" · "),
    eventDate: event.date,
  }));
}

async function searchReviews(filters: SearchFilters): Promise<SearchResult[]> {
  const { where, bindValues } = buildWhere("review", "r", filters);
  const rows = await select<{
    id: number;
    type: "week" | "month";
    period_start: string;
    status: string;
    auto_summary: string | null;
    content: string | null;
  }>(
    `SELECT r.id, r.type, r.period_start, r.status, r.auto_summary, r.content
     FROM reviews r WHERE ${where}
     ORDER BY r.period_start DESC LIMIT ?`,
    [...bindValues, LIMIT_PER_TYPE]
  );
  return rows.map((review) => ({
    type: "review",
    id: review.id,
    title: `${review.type === "week" ? "周" : "月"}复盘 · ${review.period_start}`,
    subtitle: `${statusLabel(review.status)} · ${(review.content || review.auto_summary || "无内容").slice(0, 60)}`,
    reviewType: review.type,
  }));
}

async function searchTags(filters: SearchFilters): Promise<SearchResult[]> {
  const bindValues: unknown[] = [];
  const clauses = ["t.deleted_at IS NULL", "t.status = 'active'"];
  if (filters.tag) {
    clauses.push("t.name = ?");
    bindValues.push(filters.tag);
  } else if (filters.text) {
    const ftsQuery = toFtsQuery(filters.text);
    if (ftsQuery) {
      clauses.push(`EXISTS (
        SELECT 1 FROM search_fts
        WHERE entity_type = 'tag'
          AND entity_id = t.id
          AND search_fts MATCH ?
      )`);
      bindValues.push(ftsQuery);
    } else {
      clauses.push("1 = 0");
    }
  }
  const rows = await select<{ id: number; name: string; color: string | null }>(
    `SELECT t.id, t.name, t.color FROM tags t
     WHERE ${clauses.join(" AND ")}
     ORDER BY t.name ASC LIMIT ?`,
    [...bindValues, LIMIT_PER_TYPE]
  );
  return rows.map((tag) => ({
    type: "tag",
    id: tag.id,
    title: tag.name,
    subtitle: tag.color ? `颜色 ${tag.color}` : "标签",
  }));
}

const searchers: Record<
  SearchResultType,
  (filters: SearchFilters) => Promise<SearchResult[]>
> = {
  task: searchTasks,
  note: searchNotes,
  project: searchProjects,
  goal: searchGoals,
  habit: searchHabits,
  event: searchEvents,
  review: searchReviews,
  tag: searchTags,
};

/**
 * 搜索八类业务实体。使用参数化 FTS5 匹配和普通列筛选。
 * 每类最多返回 20 条，避免输入时读取无上限结果集。
 */
export async function searchAll(rawQuery: string): Promise<SearchResult[]> {
  const filters = parseSearchQuery(rawQuery);
  if (!hasSearchCriteria(filters)) return [];

  const types = filters.types.length > 0 ? filters.types : SEARCH_TYPES;
  const groups = await Promise.all(types.map((type) => searchers[type](filters)));
  return sortByRelevance(groups.flat(), filters.text);
}

export function getSearchResultPath(result: SearchResult): string {
  switch (result.type) {
    case "task":
      return `/tasks?open=${result.id}`;
    case "note":
      return `${result.noteStatus === "inbox" ? "/inbox" : "/knowledge"}?open=${result.id}`;
    case "project":
      return `/projects?open=${result.id}`;
    case "goal":
      return `/goals?open=${result.id}`;
    case "habit":
      return `/habits?open=${result.id}`;
    case "event":
      return `/calendar?open=${result.id}&date=${result.eventDate}`;
    case "review":
      return `/review?open=${result.id}&type=${result.reviewType}`;
    case "tag":
      return `/tags?open=${result.id}`;
  }
}
