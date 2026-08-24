import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { execute, select, selectOne } from "@/db/client";
import { invoke } from "@tauri-apps/api/core";
import {
  createTag,
  updateTag,
  deleteTag,
  getTags,
  getTagsForManagement,
  getTagsFor,
  getTaggedIds,
  getTagSlice,
  mergeTags,
  setTags,
} from "@/repositories/tagRepo";
import type { Tag } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);
const mockInvoke = vi.mocked(invoke);

const makeTag = (over: Partial<Tag> = {}): Tag => ({
  id: 1,
  name: "重要",
  color: null,
  status: "active",
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("createTag", () => {
  it("插入并回查，color 默认 null", async () => {
    const tag = makeTag({ id: 2, name: "学习" });
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 2 });
    mockSelectOne.mockResolvedValue(tag);

    const result = await createTag({ name: "学习" });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO tags"),
      ["学习", null]
    );
    expect(result).toEqual(tag);
  });
});

describe("updateTag - 动态 SET", () => {
  it("单字段更新", async () => {
    await updateTag(1, { name: "新名" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE tags SET name = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新名", 1]
    );
  });

  it("多字段按代码顺序拼接", async () => {
    await updateTag(1, { color: "#f00", status: "archived" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE tags SET color = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      ["#f00", "archived", 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updateTag(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("deleteTag", () => {
  it("软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteTag(7);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE tags SET deleted_at"),
      [7]
    );
  });
});

describe("查询函数", () => {
  it("getTags 查询 active 未删除", async () => {
    mockSelect.mockResolvedValue([]);
    await getTags();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("FROM tags")
    );
  });

  it("getTagsForManagement 包含归档标签", async () => {
    mockSelect.mockResolvedValue([]);
    await getTagsForManagement();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("CASE status WHEN 'active' THEN 0 ELSE 1 END")
    );
  });

  it("getTagsFor JOIN taggables", async () => {
    mockSelect.mockResolvedValue([]);
    await getTagsFor("task", 5);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("JOIN taggables"),
      ["task", 5]
    );
  });

  it("getTaggedIds 返回 id 数组", async () => {
    mockSelect.mockResolvedValue([{ taggable_id: 10 }, { taggable_id: 20 }]);
    const result = await getTaggedIds("task", 1);
    expect(result).toEqual([10, 20]);
  });

  it("getTagSlice 并行读取七类关联实体", async () => {
    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "任务", status: "todo" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const items = await getTagSlice(9);

    expect(mockSelect).toHaveBeenCalledTimes(7);
    expect(mockSelect.mock.calls[0][0]).toContain("tg.taggable_type = 'task'");
    expect(mockSelect.mock.calls[0][1]).toEqual([9]);
    expect(items).toEqual([
      { type: "task", id: 1, title: "任务", subtitle: "任务" },
    ]);
  });
});

describe("mergeTags", () => {
  it("调用 Rust 事务命令", async () => {
    mockInvoke.mockResolvedValue(undefined);

    await mergeTags(1, 2);

    expect(mockInvoke).toHaveBeenCalledWith("merge_tags", {
      sourceTagId: 1,
      targetTagId: 2,
    });
  });
});

describe("setTags", () => {
  it("先删后插，全量替换", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await setTags("task", 5, [1, 2, 3]);

    // 第一条 DELETE
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("DELETE FROM taggables"),
      ["task", 5]
    );
    // 后三条 INSERT OR IGNORE
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT OR IGNORE INTO taggables"),
      [1, "task", 5]
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT OR IGNORE INTO taggables"),
      [2, "task", 5]
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("INSERT OR IGNORE INTO taggables"),
      [3, "task", 5]
    );
    expect(mockExecute).toHaveBeenCalledTimes(4);
  });

  it("空数组只删除不插入", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await setTags("note", 5, []);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM taggables"),
      ["note", 5]
    );
  });
});
