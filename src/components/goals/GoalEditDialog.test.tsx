import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useGoals", () => ({
  useCreateGoal: vi.fn(),
  useUpdateGoal: vi.fn(),
  useDeleteGoal: vi.fn(),
  useActiveGoals: vi.fn(),
}));
vi.mock("@/hooks/useTags", () => ({
  useTagsFor: vi.fn(),
  useSetTags: vi.fn(),
}));
vi.mock("@/components/tags/TagSelector", () => ({
  TagSelector: () => <div>标签选择器</div>,
}));

import {
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useActiveGoals,
} from "@/hooks/useGoals";
import { GoalEditDialog } from "@/components/goals/GoalEditDialog";
import { useSetTags, useTagsFor } from "@/hooks/useTags";
import type { Goal } from "@/types/entities";

const mockCreate = vi.mocked(useCreateGoal);
const mockUpdate = vi.mocked(useUpdateGoal);
const mockDelete = vi.mocked(useDeleteGoal);
const mockActiveGoals = vi.mocked(useActiveGoals);
const mockUseTagsFor = vi.mocked(useTagsFor);
const mockUseSetTags = vi.mocked(useSetTags);

const makeGoal = (over: Partial<Goal> = {}): Goal => ({
  id: 1,
  title: "目标",
  period_type: "quarter",
  period_value: null,
  progress_type: "count",
  progress_target: null,
  progress_current: 0,
  status: "active",
  notes: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockUpdate.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockDelete.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  mockActiveGoals.mockReturnValue({ data: [] } as never);
  mockUseTagsFor.mockReturnValue({ data: [] } as never);
  mockUseSetTags.mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
});

describe("GoalEditDialog", () => {
  it("新建模式：输入标题保存调用 createGoal", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockCreate.mockReturnValue({ mutate, isPending: false } as never);

    render(<GoalEditDialog goal={null} open={true} onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText(/标题/), "读3本书");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "读3本书",
        period_type: "quarter",
        progress_type: "count",
      }),
      expect.any(Object)
    );
  });

  it("空标题时保存按钮禁用", () => {
    render(<GoalEditDialog goal={null} open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("编辑模式：加载目标数据并保存调用 updateGoal", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUpdate.mockReturnValue({ mutate, isPending: false } as never);
    const goal = makeGoal({
      id: 2,
      title: "原标题",
      progress_current: 1,
      progress_target: 3,
    });

    render(<GoalEditDialog goal={goal} open={true} onOpenChange={vi.fn()} />);

    // 等待 useEffect 加载
    const titleInput = (await screen.findByDisplayValue(
      "原标题"
    )) as HTMLInputElement;
    await user.clear(titleInput);
    await user.type(titleInput, "新标题");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(mutate).toHaveBeenCalledWith(
      {
        id: 2,
        input: expect.objectContaining({ title: "新标题" }),
      },
      expect.any(Object)
    );
  });

  it("编辑模式：点删除调用 deleteGoal", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockDelete.mockReturnValue({ mutate, isPending: false } as never);
    const goal = makeGoal({ id: 5 });

    render(<GoalEditDialog goal={goal} open={true} onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /删除/ }));
    expect(mutate).toHaveBeenCalledWith(5);
  });

  it("新建模式不显示删除按钮", () => {
    render(<GoalEditDialog goal={null} open={true} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /删除/ })).toBeNull();
  });
});
