import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "@/repositories/subjectRepo";
import type { Subject } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makeSubject = (over: Partial<Subject> = {}): Subject => ({
  id: 1,
  name: "前端工程",
  sort_order: 0,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("subjectRepo", () => {
  it("getSubjects 查询未删除", async () => {
    mockSelect.mockResolvedValue([]);
    await getSubjects();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("FROM subjects")
    );
  });

  it("createSubject 插入并回查", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 2 });
    mockSelectOne.mockResolvedValue(makeSubject({ id: 2, name: "读书笔记" }));

    const result = await createSubject("读书笔记");
    expect(mockExecute).toHaveBeenCalledWith(
      `INSERT INTO subjects (name) VALUES (?)`,
      ["读书笔记"]
    );
    expect(result?.id).toBe(2);
  });

  it("updateSubject 更新名称", async () => {
    await updateSubject(3, "新名");
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE subjects SET name = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新名", 3]
    );
  });

  it("deleteSubject 软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteSubject(5);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE subjects SET deleted_at"),
      [5]
    );
  });
});
