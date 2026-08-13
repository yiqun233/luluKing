import { useState } from "react";
import { Plus, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HabitEditDialog } from "@/components/habits/HabitEditDialog";
import {
  useHabits,
  useHabitLogs,
  useLogHabit,
  useUnlogHabit,
} from "@/hooks/useHabits";
import { computeStreak, computeWeekCount, recentDays } from "@/lib/habit";
import { todayStr } from "@/lib/date";
import type { Habit } from "@/types/entities";

const statusLabels: Record<string, string> = {
  active: "进行中",
  paused: "暂停",
  archived: "归档",
};

function HabitCard({
  habit,
  onEdit,
}: {
  habit: Habit;
  onEdit: () => void;
}) {
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

  const streak = computeStreak(logs, today);
  const weekCount = computeWeekCount(logs, today);
  const recent = recentDays(logs, today, 7);
  const isWeekly = habit.frequency_type === "weekly";
  const weeklyDone =
    isWeekly && weekCount >= (habit.frequency_target ?? 1);

  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        {/* 打卡按钮 */}
        <button
          onClick={handleToggle}
          disabled={habit.status !== "active"}
          aria-label={loggedToday ? "取消今日打卡" : "今日打卡"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            loggedToday
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 text-transparent hover:border-primary hover:text-primary/40"
          } ${habit.status !== "active" ? "opacity-40" : ""}`}
        >
          <Check className="h-4 w-4" />
        </button>

        {/* 标题 + 状态 */}
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div
            className={`truncate text-sm font-medium ${
              habit.status === "archived" ? "text-muted-foreground" : ""
            }`}
          >
            {habit.title}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {isWeekly ? (
              <span>
                本周 {weekCount}/{habit.frequency_target ?? 1}
                {weeklyDone && " · 达标"}
              </span>
            ) : (
              <span className="flex items-center gap-0.5">
                <Flame className="h-3 w-3 text-orange-500" />
                连续 {streak} 天
              </span>
            )}
            {habit.status !== "active" && (
              <Badge variant="outline" className="text-[10px]">
                {statusLabels[habit.status]}
              </Badge>
            )}
          </div>
        </button>

        {/* 最近7天热力 */}
        <div className="flex items-end gap-0.5">
          {recent.map((done, i) => (
            <div
              key={i}
              title={done ? "已打卡" : "未打卡"}
              className={`h-4 w-1.5 rounded-sm ${
                done ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HabitsPage() {
  const { data: habits = [] } = useHabits();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (habit: Habit) => {
    setEditing(habit);
    setDialogOpen(true);
  };

  const activeCount = habits.filter((h) => h.status === "active").length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">习惯</h1>
          <p className="text-xs text-muted-foreground">
            {activeCount} 个进行中
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建习惯
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-2">
          {habits.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              还没有习惯，点击右上角"新建习惯"开始
            </p>
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onEdit={() => openEdit(habit)}
              />
            ))
          )}
        </div>
      </div>

      <HabitEditDialog
        habit={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
