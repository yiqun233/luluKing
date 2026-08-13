import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Check,
  Flame,
  Target,
  Inbox,
  Repeat,
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
import {
  useActiveHabits,
  useHabitLogs,
  useLogHabit,
  useUnlogHabit,
} from "@/hooks/useHabits";
import { useActiveGoals } from "@/hooks/useGoals";
import { useInboxNotes } from "@/hooks/useNotes";
import { todayStr, getReviewWindows } from "@/lib/date";
import { computeStreak, computeWeekCount } from "@/lib/habit";
import type { Task, Habit } from "@/types/entities";

function ProgressBar({
  current,
  target,
}: {
  current: number;
  target?: number | null;
}) {
  const pct =
    target && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

/** 习惯快速打卡行（仪表盘紧凑版） */
function HabitMiniRow({ habit }: { habit: Habit }) {
  const { data: logs = [] } = useHabitLogs(habit.id);
  const logHabit = useLogHabit();
  const unlogHabit = useUnlogHabit();
  const today = todayStr();
  const loggedToday = logs.includes(today);

  const handleToggle = () => {
    if (loggedToday) {
      unlogHabit.mutate({ habitId: habit.id, date: today });
    } else {
      logHabit.mutate({ habitId: habit.id, date: today });
    }
  };

  const isWeekly = habit.frequency_type === "weekly";
  const weekCount = computeWeekCount(logs, today);
  const streak = computeStreak(logs, today);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        aria-label={loggedToday ? "取消今日打卡" : "今日打卡"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
          loggedToday
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 text-transparent hover:border-primary"
        }`}
      >
        <Check className="h-3 w-3" />
      </button>
      <span className="flex-1 truncate text-sm">{habit.title}</span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {isWeekly ? (
          `${weekCount}/${habit.frequency_target}`
        ) : (
          <span className="flex items-center gap-0.5">
            <Flame className="h-3 w-3 text-orange-500" />
            {streak}
          </span>
        )}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const today = todayStr();
  const { data: todayTasks = [] } = useTodayTasks(today);
  const { data: backlog = [] } = useBacklogTasks();
  const { data: overdue = [] } = useOverdueTasks(today);
  const { data: events = [] } = useTodayEvents(today);
  const { data: habits = [] } = useActiveHabits();
  const { data: goals = [] } = useActiveGoals();
  const { data: inbox = [] } = useInboxNotes();
  const reviewWindows = getReviewWindows();

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

  const reviewLabels: string[] = [];
  if (reviewWindows.week) reviewLabels.push("本周复盘");
  if (reviewWindows.month) reviewLabels.push("本月复盘");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">个人工作台</h1>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* 欠债区：逾期 + 收件箱堆积 */}
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

          {inbox.length > 5 && (
            <Link
              to="/inbox"
              className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Inbox className="h-4 w-4 shrink-0" />
              收件箱堆积了 {inbox.length} 条待处理，去清理
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          )}

          {/* 行动区：今日任务 */}
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

          {/* 行动区：今日事件 */}
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

          {/* 例行区：习惯打卡 */}
          {habits.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">今日习惯</span>
                </div>
                <Link
                  to="/habits"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  全部 <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2 rounded-md border bg-card px-4 py-3">
                {habits.map((habit) => (
                  <HabitMiniRow key={habit.id} habit={habit} />
                ))}
              </div>
            </section>
          )}

          {/* 状态区：目标进度 */}
          {goals.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">目标进度</span>
                </div>
                <Link
                  to="/goals"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  全部 <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-3 rounded-md border bg-card px-4 py-3">
                {goals.slice(0, 4).map((g) => (
                  <div key={g.id} className="space-y-1">
                    <div className="truncate text-sm">{g.title}</div>
                    <ProgressBar
                      current={g.progress_current}
                      target={g.progress_target}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 状态区：复盘入口 */}
          {reviewLabels.length > 0 && (
            <Link
              to="/review"
              className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm hover:bg-primary/10"
            >
              <Repeat className="h-4 w-4 shrink-0 text-primary" />
              {reviewLabels.join(" · ")} 时间到了，花几分钟回顾一下
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          )}

          {/* 欠债区：待办池概览 */}
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
