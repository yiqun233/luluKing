import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "@/components/tasks/TaskItem";
import type { Task } from "@/types/entities";

const makeTask = (over: Partial<Task> = {}): Task => ({
  id: 1,
  title: "测试任务",
  status: "todo",
  plan_date: null,
  due_date: null,
  is_key: 0,
  project_id: null,
  notes: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

describe("TaskItem", () => {
  it("勾选未完成任务，触发 onToggle 为 done", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <TaskItem
        task={makeTask({ id: 5, status: "todo" })}
        onToggle={onToggle}
        onToggleKey={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith(5, "done");
  });

  it("取消勾选已完成任务，触发 onToggle 为 todo", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <TaskItem
        task={makeTask({ id: 5, status: "done" })}
        onToggle={onToggle}
        onToggleKey={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith(5, "todo");
  });

  it("点击标题触发 onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const task = makeTask({ id: 9 });
    render(
      <TaskItem
        task={task}
        onToggle={vi.fn()}
        onToggleKey={vi.fn()}
        onEdit={onEdit}
      />
    );
    await user.click(screen.getByText("测试任务"));
    expect(onEdit).toHaveBeenCalledWith(task);
  });

  it("点击重点标记触发 onToggleKey 切换为 1", async () => {
    const user = userEvent.setup();
    const onToggleKey = vi.fn();
    render(
      <TaskItem
        task={makeTask({ id: 3, is_key: 0 })}
        onToggle={vi.fn()}
        onToggleKey={onToggleKey}
        onEdit={vi.fn()}
      />
    );
    await user.click(screen.getByTitle("标记重点"));
    expect(onToggleKey).toHaveBeenCalledWith(3, 1);
  });

  it("已是重点时点击触发 onToggleKey 切换为 0", async () => {
    const user = userEvent.setup();
    const onToggleKey = vi.fn();
    render(
      <TaskItem
        task={makeTask({ id: 3, is_key: 1 })}
        onToggle={vi.fn()}
        onToggleKey={onToggleKey}
        onEdit={vi.fn()}
      />
    );
    await user.click(screen.getByTitle("取消重点"));
    expect(onToggleKey).toHaveBeenCalledWith(3, 0);
  });

  it("已完成任务标题显示删除线", () => {
    render(
      <TaskItem
        task={makeTask({ status: "done" })}
        onToggle={vi.fn()}
        onToggleKey={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByText("测试任务")).toHaveClass("line-through");
  });

  it("未完成任务标题无删除线", () => {
    render(
      <TaskItem
        task={makeTask({ status: "todo" })}
        onToggle={vi.fn()}
        onToggleKey={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByText("测试任务")).not.toHaveClass("line-through");
  });
});
