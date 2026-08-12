import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  createProject,
  updateProject,
  deleteProject,
  getProjects,
  getActiveProjects,
  getProjectsByGoal,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialsByProject,
} from "@/repositories/projectRepo";
import type { Project, Material } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makeProject = (over: Partial<Project> = {}): Project => ({
  id: 1,
  title: "项目",
  type: "delivery",
  status: "active",
  is_focus: 0,
  progress_override: null,
  goal_id: null,
  notes: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

const makeMaterial = (over: Partial<Material> = {}): Material => ({
  id: 1,
  project_id: 1,
  type: "book",
  title: "素材",
  author: null,
  pages: null,
  progress: 0,
  notes: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("createProject", () => {
  it("插入并按 lastInsertId 回查", async () => {
    const mockProject = makeProject({ id: 3, title: "新项目" });
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 3 });
    mockSelectOne.mockResolvedValue(mockProject);

    const result = await createProject({
      title: "新项目",
      type: "delivery",
      goal_id: 5,
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO projects"),
      ["新项目", "delivery", 5, null]
    );
    expect(mockSelectOne).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM projects WHERE id = ?"),
      [3]
    );
    expect(result).toEqual(mockProject);
  });

  it("未提供可选字段时传 null", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
    mockSelectOne.mockResolvedValue(makeProject());
    await createProject({ title: "学习", type: "study" });
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), [
      "学习",
      "study",
      null,
      null,
    ]);
  });
});

describe("updateProject - 动态 SET", () => {
  it("单字段更新", async () => {
    await updateProject(1, { title: "改名" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE projects SET title = ?, updated_at = datetime('now') WHERE id = ?`,
      ["改名", 1]
    );
  });

  it("多字段更新按代码顺序拼接", async () => {
    await updateProject(1, { is_focus: 1, status: "done" });
    // 代码顺序：status(3) 先于 is_focus(4)
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE projects SET status = ?, is_focus = ?, updated_at = datetime('now') WHERE id = ?`,
      ["done", 1, 1]
    );
  });

  it("null 值字段传递（清空 goal_id）", async () => {
    await updateProject(1, { goal_id: null });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE projects SET goal_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [null, 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updateProject(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("deleteProject", () => {
  it("软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteProject(9);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE projects SET deleted_at"),
      [9]
    );
  });
});

describe("查询函数", () => {
  it("getProjects 查询未删除", async () => {
    mockSelect.mockResolvedValue([]);
    await getProjects();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("FROM projects")
    );
  });

  it("getActiveProjects 查询 active", async () => {
    mockSelect.mockResolvedValue([]);
    await getActiveProjects();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("status = 'active'")
    );
  });

  it("getProjectsByGoal 按目标查询", async () => {
    mockSelect.mockResolvedValue([]);
    await getProjectsByGoal(5);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("goal_id = ?"),
      [5]
    );
  });
});

describe("素材", () => {
  it("createMaterial 插入并回查，progress 默认 0", async () => {
    const mockMat = makeMaterial({ id: 2, title: "书" });
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 2 });
    mockSelectOne.mockResolvedValue(mockMat);

    const result = await createMaterial({
      project_id: 1,
      type: "book",
      title: "书",
      pages: 300,
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO materials"),
      [1, "book", "书", null, 300]
    );
    expect(result?.id).toBe(2);
  });

  it("updateMaterial 更新进度", async () => {
    await updateMaterial(3, { progress: 50 });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE materials SET progress = ?, updated_at = datetime('now') WHERE id = ?`,
      [50, 3]
    );
  });

  it("updateMaterial 多字段按顺序", async () => {
    await updateMaterial(3, { title: "新名", progress: 80 });
    // 代码顺序：title(2) 先于 progress(5)
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE materials SET title = ?, progress = ?, updated_at = datetime('now') WHERE id = ?`,
      ["新名", 80, 3]
    );
  });

  it("deleteMaterial 软删除", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 0 });
    await deleteMaterial(4);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE materials SET deleted_at"),
      [4]
    );
  });

  it("getMaterialsByProject 按项目查询", async () => {
    mockSelect.mockResolvedValue([]);
    await getMaterialsByProject(7);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("project_id = ?"),
      [7]
    );
  });
});
