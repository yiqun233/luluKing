import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useTasks", () => ({
  useCreateTask: vi.fn(),
}));

import { useCreateTask } from "@/hooks/useTasks";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";

const mockUseCreateTask = vi.mocked(useCreateTask);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCreateTask.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
});

describe("QuickAddTask", () => {
  it("输入标题回车调用 mutate 创建任务", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseCreateTask.mockReturnValue({ mutate, isPending: false } as never);

    render(<QuickAddTask />);
    const input = screen.getByPlaceholderText(/快速添加任务/);
    await user.type(input, "买牛奶");
    await user.keyboard("{Enter}");

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      title: "买牛奶",
      plan_date: expect.any(String),
    });
  });

  it("空标题回车不创建", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseCreateTask.mockReturnValue({ mutate, isPending: false } as never);

    render(<QuickAddTask />);
    await user.keyboard("{Enter}");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("默认加入今日（plan_date 非空）", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseCreateTask.mockReturnValue({ mutate, isPending: false } as never);

    render(<QuickAddTask />);
    await user.type(screen.getByPlaceholderText(/快速添加任务/), "今日事{Enter}");

    const call = mutate.mock.calls[0][0] as { plan_date: string | null };
    expect(call.plan_date).toBeTruthy();
  });

  it("切换到待办池后 plan_date 为 null", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseCreateTask.mockReturnValue({ mutate, isPending: false } as never);

    render(<QuickAddTask />);
    await user.click(screen.getByRole("button", { name: "今日" }));
    await user.type(screen.getByPlaceholderText(/快速添加任务/), "待办{Enter}");

    expect(mutate).toHaveBeenCalledWith({
      title: "待办",
      plan_date: null,
    });
  });

  it("创建后清空输入框", async () => {
    const user = userEvent.setup();
    mockUseCreateTask.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<QuickAddTask />);
    const input = screen.getByPlaceholderText(/快速添加任务/) as HTMLInputElement;
    await user.type(input, "任务A{Enter}");
    expect(input.value).toBe("");
  });
});
