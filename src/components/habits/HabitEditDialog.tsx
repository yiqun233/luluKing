import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
} from "@/hooks/useHabits";
import { useActiveGoals } from "@/hooks/useGoals";
import type { Habit, HabitFrequencyType, HabitStatus } from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface HabitEditDialogProps {
  habit: Habit | null; // null = 新建模式
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitEditDialog({
  habit,
  open,
  onOpenChange,
}: HabitEditDialogProps) {
  const isCreate = !habit;
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const { data: goals } = useActiveGoals();

  const [title, setTitle] = useState("");
  const [frequencyType, setFrequencyType] = useState<HabitFrequencyType>(
    "daily"
  );
  const [frequencyTarget, setFrequencyTarget] = useState("1");
  const [goalId, setGoalId] = useState<string>("");
  const [status, setStatus] = useState<HabitStatus>("active");

  // 打开时根据 habit 重置（新建用默认值，编辑用习惯值）
  useEffect(() => {
    if (open) {
      setTitle(habit?.title ?? "");
      setFrequencyType(habit?.frequency_type ?? "daily");
      setFrequencyTarget((habit?.frequency_target ?? 1).toString());
      setGoalId(habit?.goal_id != null ? habit.goal_id.toString() : "");
      setStatus(habit?.status ?? "active");
    }
  }, [open, habit]);

  const handleSave = () => {
    const payload = {
      title,
      frequency_type: frequencyType,
      frequency_target:
        frequencyType === "weekly" ? Number(frequencyTarget) || 1 : 1,
      goal_id: goalId ? Number(goalId) : null,
    };
    if (isCreate) {
      createHabit.mutate(payload);
    } else {
      updateHabit.mutate({ id: habit!.id, input: { ...payload, status } });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!habit) return;
    deleteHabit.mutate(habit.id);
    onOpenChange(false);
  };

  const pending = createHabit.isPending || updateHabit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? "新建习惯" : "编辑习惯"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="habit-title">标题</Label>
            <Input
              id="habit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：每天阅读 30 分钟"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="habit-freq">频率类型</Label>
              <select
                id="habit-freq"
                className={selectClass}
                value={frequencyType}
                onChange={(e) =>
                  setFrequencyType(e.target.value as HabitFrequencyType)
                }
              >
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
              </select>
            </div>
            {frequencyType === "weekly" && (
              <div className="space-y-1.5">
                <Label htmlFor="habit-target">每周目标次数</Label>
                <Input
                  id="habit-target"
                  type="number"
                  min={1}
                  value={frequencyTarget}
                  onChange={(e) => setFrequencyTarget(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="habit-goal">关联目标（可选）</Label>
            <select
              id="habit-goal"
              className={selectClass}
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
            >
              <option value="">无</option>
              {goals?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
          {!isCreate && (
            <div className="space-y-1.5">
              <Label htmlFor="habit-status">状态</Label>
              <select
                id="habit-status"
                className={selectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as HabitStatus)}
              >
                <option value="active">进行中</option>
                <option value="paused">暂停</option>
                <option value="archived">归档</option>
              </select>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {!isCreate ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteHabit.isPending}
            >
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={pending || !title.trim()}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
