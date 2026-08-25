import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  useAvailableWeekPlanTasks,
  useCreatePlan,
  useDeletePlan,
  usePlanTaskCommitments,
  useSaveWeekPlan,
  useUpdatePlan,
} from "@/hooks/usePlans";
import { feedback } from "@/components/feedback/FeedbackProvider";
import type {
  Plan,
  PlanTaskCommitment,
  PlanTaskResolution,
  PlanType,
  Task,
} from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const EMPTY_COMMITMENTS: PlanTaskCommitment[] = [];

const resolutionLabels: Record<PlanTaskResolution, string> = {
  completed: "已完成",
  rolled_over: "已顺延",
  backlog: "已回待办池",
  abandoned: "已放弃",
};

interface PlanEditDialogProps {
  plan: Plan | null; // null = 新建
  defaultType?: PlanType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanEditDialog({
  plan,
  defaultType = "week",
  open,
  onOpenChange,
}: PlanEditDialogProps) {
  const isCreate = !plan;
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const saveWeekPlan = useSaveWeekPlan();

  const [type, setType] = useState<PlanType>(defaultType);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [content, setContent] = useState("");
  const [taskIds, setTaskIds] = useState<number[]>([]);
  const { data: commitments = EMPTY_COMMITMENTS } = usePlanTaskCommitments(
    open && plan?.type === "week" ? plan.id : null
  );
  const { data: availableTasks = [], isLoading: isLoadingAvailableTasks } =
    useAvailableWeekPlanTasks(open && type === "week");

  useEffect(() => {
    if (open) {
      setType(plan?.type ?? defaultType);
      setPeriodStart(plan?.period_start ?? "");
      setPeriodEnd(plan?.period_end ?? "");
      setContent(plan?.content ?? "");
      setTaskIds(
        plan?.type === "week"
          ? commitments
              .filter((commitment) => commitment.resolution === null && commitment.status === "todo")
              .map((commitment) => commitment.task_id)
          : []
      );
      // 新建时自动填充本周/本月
      if (!plan) {
        const now = new Date();
        if (defaultType === "week") {
          setPeriodStart(fmt(startOfWeek(now, { weekStartsOn: 1 })));
          setPeriodEnd(fmt(endOfWeek(now, { weekStartsOn: 1 })));
        } else {
          setPeriodStart(fmt(startOfMonth(now)));
          setPeriodEnd(fmt(endOfMonth(now)));
        }
      }
    }
  }, [open, plan, defaultType, commitments]);

  const candidateTasks = useMemo(() => {
    const byId = new Map<number, Task>();
    for (const commitment of commitments) {
      if (commitment.resolution === null && commitment.status === "todo") {
        byId.set(commitment.task_id, commitment);
      }
    }
    for (const task of availableTasks) byId.set(task.id, task);
    return [...byId.values()];
  }, [availableTasks, commitments]);

  const resolvedCommitments = commitments.filter(
    (commitment) => commitment.resolution !== null
  );

  const toggleTask = (taskId: number, checked: boolean) => {
    setTaskIds((current) =>
      checked
        ? [...new Set([...current, taskId])]
        : current.filter((id) => id !== taskId)
    );
  };

  const fillCurrent = (t: PlanType) => {
    const now = new Date();
    if (t === "week") {
      setPeriodStart(fmt(startOfWeek(now, { weekStartsOn: 1 })));
      setPeriodEnd(fmt(endOfWeek(now, { weekStartsOn: 1 })));
    } else {
      setPeriodStart(fmt(startOfMonth(now)));
      setPeriodEnd(fmt(endOfMonth(now)));
    }
  };

  const handleSave = () => {
    if (!periodStart || !periodEnd) return;
    if (type === "week") {
      saveWeekPlan.mutate(
        {
          id: plan?.id,
          period_start: periodStart,
          period_end: periodEnd,
          content: content || null,
          task_ids: taskIds,
        },
        {
          onSuccess: () => {
            feedback.success("周计划与承诺已保存");
            onOpenChange(false);
          },
          onError: (error) =>
            feedback.error(error instanceof Error ? error.message : "周计划保存失败"),
        }
      );
    } else if (isCreate) {
      createPlan.mutate(
        {
          type,
          period_start: periodStart,
          period_end: periodEnd,
          content: content || null,
        },
        {
          onSuccess: () => {
            feedback.success("计划已保存");
            onOpenChange(false);
          },
          onError: () => feedback.error("计划保存失败，请稍后重试"),
        }
      );
    } else {
      updatePlan.mutate({
        id: plan!.id,
        input: {
          type,
          period_start: periodStart,
          period_end: periodEnd,
          content: content || null,
        },
      }, {
        onSuccess: () => {
          feedback.success("计划已保存");
          onOpenChange(false);
        },
        onError: () => feedback.error("计划保存失败，请稍后重试"),
      });
    }
  };

  const handleDelete = () => {
    if (!plan) return;
    deletePlan.mutate(plan.id);
    onOpenChange(false);
  };

  const pending =
    createPlan.isPending || updatePlan.isPending || saveWeekPlan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? "新建计划" : "编辑计划"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-type">类型</Label>
              <select
                id="plan-type"
                className={selectClass}
                value={type}
                onChange={(e) => {
                  const t = e.target.value as PlanType;
                  setType(t);
                  fillCurrent(t);
                }}
                disabled={!isCreate}
              >
                <option value="week">周计划</option>
                <option value="month">月计划</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-start">开始日期</Label>
              <Input
                id="plan-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-end">结束日期</Label>
              <Input
                id="plan-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fillCurrent(type)}
            >
              填充本{type === "week" ? "周" : "月"}
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-content">计划内容</Label>
            <Textarea
              id="plan-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="本周/本月计划…&#10;可按目标、项目、任务分条列出。"
              className="resize-y"
            />
          </div>
          {type === "week" && (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <div>
                <Label>本周承诺</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  从待办池选择任务；未完成项会在同周期周复盘中要求明确处理去向。
                </p>
              </div>
              {isLoadingAvailableTasks ? (
                <p className="text-xs text-muted-foreground">正在加载待办池…</p>
              ) : candidateTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  待办池中没有可承诺任务。
                </p>
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {candidateTasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent/60"
                    >
                      <Checkbox
                        checked={taskIds.includes(task.id)}
                        onCheckedChange={(checked) => toggleTask(task.id, checked === true)}
                        aria-label={`承诺任务：${task.title}`}
                      />
                      <span className="flex-1">{task.title}</span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">截止 {task.due_date}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              {resolvedCommitments.length > 0 && (
                <div className="border-t pt-2">
                  <p className="mb-1 text-xs text-muted-foreground">已处理承诺</p>
                  <div className="space-y-1">
                    {resolvedCommitments.map((commitment) => (
                      <div key={commitment.task_id} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="flex-1 line-through">{commitment.title}</span>
                        <span>{resolutionLabels[commitment.resolution!]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {!isCreate ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deletePlan.isPending}
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
            <Button
              onClick={handleSave}
              disabled={pending || !periodStart || !periodEnd}
            >
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
