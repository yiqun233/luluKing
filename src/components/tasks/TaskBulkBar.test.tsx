import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useTasks", () => ({
  useBulkUpdateTasks: vi.fn(),
  useBulkDeleteTasks: vi.fn(),
}));
vi.mock("@/hooks/useProjects", () => ({ useProjects: vi.fn() }));

import { useBulkDeleteTasks, useBulkUpdateTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { TaskBulkBar } from "@/components/tasks/TaskBulkBar";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useBulkUpdateTasks).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useBulkDeleteTasks).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useProjects).mockReturnValue({ data: [] } as never);
});

describe("TaskBulkBar", () => {
  it("将所选任务批量安排到今日", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useBulkUpdateTasks).mockReturnValue({ mutate, isPending: false } as never);

    render(
      <TaskBulkBar
        selectedIds={[3, 5]}
        allIds={[3, 5, 8]}
        onSelectAll={vi.fn()}
        onClear={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "今日" }));

    expect(mutate).toHaveBeenCalledWith({
      ids: [3, 5],
      input: { plan_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
    });
  });

  it("批量删除需二次确认，成功后清空选择", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    const onClear = vi.fn();
    vi.mocked(useBulkDeleteTasks).mockReturnValue({ mutate, isPending: false } as never);

    render(
      <TaskBulkBar
        selectedIds={[3, 5]}
        allIds={[3, 5]}
        onSelectAll={vi.fn()}
        onClear={onClear}
      />
    );
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(mutate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "删除任务" }));

    expect(mutate).toHaveBeenCalledWith([3, 5], expect.objectContaining({ onSuccess: expect.any(Function) }));
    const callbacks = mutate.mock.calls[0][1] as { onSuccess: () => void };
    callbacks.onSuccess();
    expect(onClear).toHaveBeenCalled();
  });
});
