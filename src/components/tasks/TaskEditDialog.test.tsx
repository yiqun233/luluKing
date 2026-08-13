import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useTasks", () => ({
  useCreateTask: vi.fn(),
  useUpdateTask: vi.fn(),
  useDeleteTask: vi.fn(),
}));
vi.mock("@/hooks/useProjects", () => ({ useProjects: vi.fn() }));
vi.mock("@/hooks/useTags", () => ({
  useTagsFor: vi.fn(),
  useSetTags: vi.fn(),
}));
vi.mock("@/components/tags/TagSelector", () => ({
  TagSelector: () => <div>标签选择器</div>,
}));
vi.mock("@/components/tasks/ChecklistEditor", () => ({
  ChecklistEditor: () => <div>清单</div>,
}));

import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useSetTags, useTagsFor } from "@/hooks/useTags";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";

const mutation = (mutate = vi.fn()) => ({ mutate, isPending: false }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCreateTask).mockReturnValue(mutation());
  vi.mocked(useUpdateTask).mockReturnValue(mutation());
  vi.mocked(useDeleteTask).mockReturnValue(mutation());
  vi.mocked(useProjects).mockReturnValue({ data: [] } as never);
  vi.mocked(useTagsFor).mockReturnValue({ data: [] } as never);
  vi.mocked(useSetTags).mockReturnValue(mutation());
});

describe("TaskEditDialog", () => {
  it("保存失败时保留弹窗与已输入内容", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const mutate = vi.fn();
    vi.mocked(useCreateTask).mockReturnValue(mutation(mutate));

    render(<TaskEditDialog task={null} open onOpenChange={onOpenChange} />);
    await user.type(screen.getByLabelText("标题"), "保留的任务");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("保留的任务")).toBeInTheDocument();
  });

  it("删除任务前要求二次确认", async () => {
    const user = userEvent.setup();
    const deleteMutate = vi.fn();
    vi.mocked(useDeleteTask).mockReturnValue(mutation(deleteMutate));

    render(
      <TaskEditDialog
        task={{
          id: 1,
          title: "任务",
          status: "todo",
          plan_date: null,
          due_date: null,
          is_key: 0,
          project_id: null,
          notes: null,
          created_at: "2026-08-13 00:00:00",
          updated_at: "2026-08-13 00:00:00",
          deleted_at: null,
          synced_at: null,
        }}
        open
        onOpenChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByRole("heading", { name: "删除任务？" })).toBeInTheDocument();
    expect(deleteMutate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "删除任务" }));
    expect(deleteMutate).toHaveBeenCalledWith(1, expect.any(Object));
  });
});
