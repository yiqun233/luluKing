// ============================================================
// 全局搜索数据访问层（跨实体 LIKE 搜索）
// ============================================================

import { select } from "@/db/client";

export type SearchResultType = "task" | "note" | "project" | "goal";

export interface SearchResult {
  type: SearchResultType;
  id: number;
  title: string;
  subtitle?: string;
}

/** 跨任务/笔记/项目/目标搜索标题与内容 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = `%${query}%`;

  const [tasks, notes, projects, goals] = await Promise.all([
    select<{ id: number; title: string; status: string }>(
      `SELECT id, title, status FROM tasks
       WHERE title LIKE ? AND deleted_at IS NULL
       LIMIT 20`,
      [q]
    ),
    select<{ id: number; title: string | null; content: string }>(
      `SELECT id, title, content FROM notes
       WHERE (title LIKE ? OR content LIKE ?) AND deleted_at IS NULL
       LIMIT 20`,
      [q, q]
    ),
    select<{ id: number; title: string; type: string }>(
      `SELECT id, title, type FROM projects
       WHERE title LIKE ? AND deleted_at IS NULL
       LIMIT 20`,
      [q]
    ),
    select<{ id: number; title: string }>(
      `SELECT id, title FROM goals
       WHERE title LIKE ? AND deleted_at IS NULL
       LIMIT 20`,
      [q]
    ),
  ]);

  const results: SearchResult[] = [];
  for (const t of tasks) {
    results.push({
      type: "task",
      id: t.id,
      title: t.title,
      subtitle: t.status === "done" ? "已完成" : undefined,
    });
  }
  for (const n of notes) {
    results.push({
      type: "note",
      id: n.id,
      title: n.title || n.content.slice(0, 30) || "无标题",
      subtitle: n.content.slice(0, 60),
    });
  }
  for (const p of projects) {
    results.push({
      type: "project",
      id: p.id,
      title: p.title,
      subtitle: p.type === "study" ? "学习项目" : "交付项目",
    });
  }
  for (const g of goals) {
    results.push({ type: "goal", id: g.id, title: g.title });
  }
  return results;
}
