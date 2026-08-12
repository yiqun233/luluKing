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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
} from "@/hooks/useGoals";
import type {
  Goal,
  GoalPeriodType,
  GoalProgressType,
  GoalStatus,
} from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface GoalEditDialogProps {
  goal: Goal | null; // null = 新建模式
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalEditDialog({
  goal,
  open,
  onOpenChange,
}: GoalEditDialogProps) {
  const isCreate = !goal;
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [title, setTitle] = useState("");
  const [periodType, setPeriodType] = useState<GoalPeriodType>("quarter");
  const [periodValue, setPeriodValue] = useState("");
  const [progressType, setProgressType] = useState<GoalProgressType>("count");
  const [progressTarget, setProgressTarget] = useState("");
  const [progressCurrent, setProgressCurrent] = useState("0");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [notes, setNotes] = useState("");

  // 打开时根据 goal 重置（新建用默认值，编辑用目标值）
  useEffect(() => {
    if (open) {
      setTitle(goal?.title ?? "");
      setPeriodType(goal?.period_type ?? "quarter");
      setPeriodValue(goal?.period_value ?? "");
      setProgressType(goal?.progress_type ?? "count");
      setProgressTarget(goal?.progress_target?.toString() ?? "");
      setProgressCurrent(goal?.progress_current.toString() ?? "0");
      setStatus(goal?.status ?? "active");
      setNotes(goal?.notes ?? "");
    }
  }, [open, goal]);

  const handleSave = () => {
    const payload = {
      title,
      period_type: periodType,
      period_value: periodValue || null,
      progress_type: progressType,
      progress_target: progressTarget ? Number(progressTarget) : null,
      progress_current: Number(progressCurrent) || 0,
      status,
      notes: notes || null,
    };
    if (isCreate) {
      createGoal.mutate(payload);
    } else {
      updateGoal.mutate({ id: goal!.id, input: payload });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!goal) return;
    deleteGoal.mutate(goal.id);
    onOpenChange(false);
  };

  const pending = createGoal.isPending || updateGoal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? "新建目标" : "编辑目标"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">标题</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：本季度读完 3 本技术书"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-period">周期类型</Label>
              <select
                id="goal-period"
                className={selectClass}
                value={periodType}
                onChange={(e) =>
                  setPeriodType(e.target.value as GoalPeriodType)
                }
              >
                <option value="quarter">季度</option>
                <option value="year">年度</option>
                <option value="long">长期</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-period-value">周期值</Label>
              <Input
                id="goal-period-value"
                value={periodValue}
                onChange={(e) => setPeriodValue(e.target.value)}
                placeholder="如 2026Q3"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-progress-type">进度类型</Label>
              <select
                id="goal-progress-type"
                className={selectClass}
                value={progressType}
                onChange={(e) =>
                  setProgressType(e.target.value as GoalProgressType)
                }
              >
                <option value="count">计数型</option>
                <option value="aggregate">汇总型</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">目标值</Label>
              <Input
                id="goal-target"
                type="number"
                value={progressTarget}
                onChange={(e) => setProgressTarget(e.target.value)}
                placeholder="如 3"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">当前值</Label>
              <Input
                id="goal-current"
                type="number"
                value={progressCurrent}
                onChange={(e) => setProgressCurrent(e.target.value)}
              />
            </div>
            {!isCreate && (
              <div className="space-y-1.5">
                <Label htmlFor="goal-status">状态</Label>
                <select
                  id="goal-status"
                  className={selectClass}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GoalStatus)}
                >
                  <option value="active">进行中</option>
                  <option value="done">已完成</option>
                  <option value="abandoned">已放弃</option>
                </select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-notes">备注</Label>
            <Textarea
              id="goal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="目标说明…"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {!isCreate ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteGoal.isPending}
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
