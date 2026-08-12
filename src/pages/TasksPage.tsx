import { useState } from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";
import {
  useTodayTasks,
  useBacklogTasks,
  useOverdueTasks,
  useToggleTaskStatus,
  useUpdateTask,
} from "@/hooks/useTasks";
import { todayStr } from "@/lib/date";
import type { Task } from "@/types/entities";

export function TasksPage() {
  const today = todayStr();
  const { data: todayTasks = [] } = useTodayTasks(today);
  const { data: backlog = [] } = useBacklogTasks();
  const { data: overdue = [] } = useOverdueTasks(today);

  const toggleStatus = useToggleTaskStatus();
  const updateTask = useUpdateTask();

  const [editing, setEditing] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openEdit = (task: Task) => {
    setEditing(task);
    setDialogOpen(true);
  };

  const todayDone = todayTasks.filter((t) => t.status === "done").length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">任务</h1>
          <p className="text-xs text-muted-foreground">
            今日 {todayDone}/{todayTasks.length} 完成
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          <QuickAddTask />

          {/* 逾期 */}
          {overdue.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                逾期（{overdue.length}）
              </div>
              <div className="space-y-1.5">
                {overdue.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(id, status) => toggleStatus.mutate({ id, status })}
                    onToggleKey={(id, isKey) =>
                      updateTask.mutate({ id, input: { is_key: isKey } })
                    }
                    onEdit={openEdit}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 今日清单 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              今日（{todayTasks.length}）
            </div>
            {todayTasks.length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                今天还没有安排任务，在上方添加一个吧
              </p>
            ) : (
              <div className="space-y-1.5">
                {todayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(id, status) =>
                      toggleStatus.mutate({ id, status })
                    }
                    onToggleKey={(id, isKey) =>
                      updateTask.mutate({ id, input: { is_key: isKey } })
                    }
                    onEdit={openEdit}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 待办池 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Circle className="h-4 w-4 text-muted-foreground" />
              待办池（{backlog.length}）
            </div>
            {backlog.length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                待办池是空的
              </p>
            ) : (
              <div className="space-y-1.5">
                {backlog.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(id, status) =>
                      toggleStatus.mutate({ id, status })
                    }
                    onToggleKey={(id, isKey) =>
                      updateTask.mutate({ id, input: { is_key: isKey } })
                    }
                    onEdit={openEdit}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <TaskEditDialog
        task={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
