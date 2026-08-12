import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  createNote,
  updateNote,
  deleteNote,
  getInboxNotes,
  getKnowledgeNotes,
  getNotesBySubject,
} from "@/repositories/noteRepo";
import type { Note } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makeNote = (over: Partial<Note> = {}): Note => ({
  id: 1,
  title: null,
  content: "内容",
  status: "inbox",
  subject_id: null,
  source: "inbox",
  related_goal_id: null,
  related_project_id: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("createNote", () => {
  it("默认创建收件箱笔记（status=inbox, source=inbox）", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 3 });
    mockSelectOne.mockResolvedValue(makeNote({ id: 3 }));

    await createNote({ content: "记一笔" });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO notes"),
      [null, "记一笔", "inbox", null, "inbox"]
    );
  });

  it("升级为知识时 status=knowledge", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
    mockSelectOne.mockResolvedValue(makeNote());
    await createNote({
      content: "x",
      title: "标题",
      status: "knowledge",
      subject_id: 2,
      source: "new",
    });
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), [
      "标题",
      "x",
      "knowledge",
      2,
      "new",
    ]);
  });
});

describe("updateNote - 动态 SET", () => {
  it("单字段更新", async () => {
    await updateNote(1, { content: "新内容" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE notes SET content = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新内容", 1]
    );
  });

  it("多字段按代码顺序拼接", async () => {
    await updateNote(1, { subject_id: 5, status: "knowledge" });
    // 代码顺序：status(3) 先于 subject_id(4)
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE notes SET status = ?, subject_id = ?, updated_at = datetime('now') WHERE id = ?`,
      ["knowledge", 5, 1]
    );
  });

  it("null 值字段传递（清空标题）", async () => {
    await updateNote(1, { title: null });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE notes SET title = ?, updated_at = datetime('now') WHERE id = ?`,
      [null, 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updateNote(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("deleteNote", () => {
  it("软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteNote(9);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE notes SET deleted_at"),
      [9]
    );
  });
});

describe("查询函数", () => {
  it("getInboxNotes 查询 inbox", async () => {
    mockSelect.mockResolvedValue([]);
    await getInboxNotes();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("status = 'inbox'")
    );
  });

  it("getKnowledgeNotes 查询 knowledge", async () => {
    mockSelect.mockResolvedValue([]);
    await getKnowledgeNotes();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("status = 'knowledge'")
    );
  });

  it("getNotesBySubject 按主题查询", async () => {
    mockSelect.mockResolvedValue([]);
    await getNotesBySubject(4);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("subject_id = ?"),
      [4]
    );
  });
});
