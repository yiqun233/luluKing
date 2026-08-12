import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";
import { EventItem } from "@/components/calendar/EventItem";
import {
  useTodayTasks,
  useBacklogTasks,
  useOverdueTasks,
  useToggleTaskStatus,
  useUpdateTask,
} from "@/hooks/useTasks";
import { useTodayEvents } from "@/hooks/useEvents";
import { todayStr } from "@/lib/date";
import type { Task } from "@/types/entities";

export function DashboardPage() {
  const today = todayStr();
  const { data: todayTasks = [] } = useTodayTasks(today);
  const { data: backlog = [] } = useBacklogTasks();
  const { data: overdue = [] } = useOverdueTasks(today);
  const { data: events = [] } = useTodayEvents(today);

  const toggleStatus = useToggleTaskStatus();
  const updateTask = useUpdateTask();

  const [editing, setEditing] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openEdit = (task: Task) => {
    setEditing(task);
    setDialogOpen(true);
  };

  const todayDone = todayTasks.filter((t) => t.status === "done").length;
  const keyTodo = todayTasks.filter((t) => t.is_key === 1 && t.status === "todo");
  const normalTodo = todayTasks.filter(
    (t) => t.is_key === 0 && t.status === "todo"
  );
  const doneTasks = todayTasks.filter((t) => t.status === "done");
  const dateLabel = format(new Date(), "M月d日 EEEE", { locale: zhCN });

  const renderTask = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      onToggle={(id, status) => toggleStatus.mutate({ id, status })}
      onToggleKey={(id, isKey) =>
        updateTask.mutate({ id, input: { is_key: isKey } })
      }
      onEdit={openEdit}
    />
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">个人工作台</h1>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* 逾期提醒 */}
          {overdue.length > 0 && (
            <Link
              to="/tasks"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive hover:bg-destructive/10"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              你有 {overdue.length} 个逾期任务，点击查看
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          )}

          {/* 今日任务 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">今日任务</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {todayDone}/{todayTasks.length} 完成
              </span>
            </div>
            {todayTasks.length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                今天还没有任务，去
                <Link to="/tasks" className="text-primary hover:underline">
                  任务页
                </Link>
                添加吧
              </p>
            ) : (
              <div className="space-y-1.5">
                {keyTodo.map(renderTask)}
                {keyTodo.length > 0 && normalTodo.length > 0 && (
                  <div className="my-1 border-t" />
                )}
                {normalTodo.map(renderTask)}
                {doneTasks.length > 0 &&
                  (keyTodo.length > 0 || normalTodo.length > 0) && (
                    <div className="my-1 border-t" />
                  )}
                {doneTasks.map(renderTask)}
              </div>
            )}
          </section>

          {/* 今日事件 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">今日事件</span>
              </div>
              <Link
                to="/calendar"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                查看日历 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {events.length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                今天没有事件
              </p>
            ) : (
              <div className="space-y-1.5">
                {events.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    onEdit={() => {}}
                    readOnly
                  />
                ))}
              </div>
            )}
          </section>

          {/* 待办池概览 */}
          {backlog.length > 0 && (
            <Link
              to="/tasks"
              className="flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm hover:bg-accent/40"
            >
              <span className="font-medium">待办池</span>
              <span className="text-muted-foreground">
                {backlog.length} 个任务等待安排
              </span>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </Link>
          )}
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
