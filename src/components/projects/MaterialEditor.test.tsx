import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useProjects", () => ({
  useMaterialsByProject: vi.fn(),
  useCreateMaterial: vi.fn(),
  useUpdateMaterial: vi.fn(),
  useDeleteMaterial: vi.fn(),
}));

import {
  useMaterialsByProject,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from "@/hooks/useProjects";
import { MaterialEditor } from "@/components/projects/MaterialEditor";
import type { Project, Material } from "@/types/entities";

const mockMaterials = vi.mocked(useMaterialsByProject);
const mockCreate = vi.mocked(useCreateMaterial);
const mockUpdate = vi.mocked(useUpdateMaterial);
const mockDelete = vi.mocked(useDeleteMaterial);

const makeProject = (over: Partial<Project> = {}): Project => ({
  id: 1,
  title: "学习项目",
  type: "study",
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

beforeEach(() => {
  vi.clearAllMocks();
  mockMaterials.mockReturnValue({ data: [] } as never);
  mockCreate.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUpdate.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockDelete.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
});

describe("MaterialEditor", () => {
  it("输入标题回车调用 createMaterial", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockCreate.mockReturnValue({ mutate, isPending: false } as never);
    const project = makeProject({ id: 7 });

    render(<MaterialEditor project={project} />);
    await user.type(
      screen.getByPlaceholderText(/添加学习素材/),
      "深入理解计算机系统{Enter}"
    );

    expect(mutate).toHaveBeenCalledWith({
      project_id: 7,
      type: "book",
      title: "深入理解计算机系统",
    });
  });

  it("空标题回车不创建", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockCreate.mockReturnValue({ mutate, isPending: false } as never);

    render(<MaterialEditor project={makeProject()} />);
    await user.keyboard("{Enter}");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("显示素材列表", () => {
    mockMaterials.mockReturnValue({
      data: [
        makeMaterial({ id: 1, title: "书A" }),
        makeMaterial({ id: 2, title: "书B", type: "article" }),
      ],
    } as never);

    render(<MaterialEditor project={makeProject()} />);
    expect(screen.getByText("书A")).toBeInTheDocument();
    expect(screen.getByText("书B")).toBeInTheDocument();
  });

  it("空列表显示提示", () => {
    mockMaterials.mockReturnValue({ data: [] } as never);
    render(<MaterialEditor project={makeProject()} />);
    expect(screen.getByText(/暂无素材/)).toBeInTheDocument();
  });

  it("点删除调用 deleteMaterial", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockDelete.mockReturnValue({ mutate, isPending: false } as never);
    mockMaterials.mockReturnValue({
      data: [makeMaterial({ id: 3, title: "书C" })],
    } as never);

    render(<MaterialEditor project={makeProject()} />);
    await user.click(screen.getByLabelText("删除素材"));
    expect(mutate).toHaveBeenCalledWith(3);
  });

  it("进度输入 onBlur 调用 updateMaterial", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUpdate.mockReturnValue({ mutate, isPending: false } as never);
    mockMaterials.mockReturnValue({
      data: [makeMaterial({ id: 4, title: "书D", progress: 0 })],
    } as never);

    render(<MaterialEditor project={makeProject()} />);
    const progressInput = screen.getByLabelText("进度");
    await user.clear(progressInput);
    await user.type(progressInput, "50");
    progressInput.blur();

    expect(mutate).toHaveBeenCalledWith({ id: 4, input: { progress: 50 } });
  });
});
