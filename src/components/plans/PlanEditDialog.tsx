import { useEffect, useState } from "react";
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
import { useCreatePlan, useUpdatePlan, useDeletePlan } from "@/hooks/usePlans";
import type { Plan, PlanType } from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

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

  const [type, setType] = useState<PlanType>(defaultType);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      setType(plan?.type ?? defaultType);
      setPeriodStart(plan?.period_start ?? "");
      setPeriodEnd(plan?.period_end ?? "");
      setContent(plan?.content ?? "");
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
  }, [open, plan, defaultType]);

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
    if (isCreate) {
      createPlan.mutate({
        type,
        period_start: periodStart,
        period_end: periodEnd,
        content: content || null,
      });
    } else {
      updatePlan.mutate({
        id: plan!.id,
        input: {
          type,
          period_start: periodStart,
          period_end: periodEnd,
          content: content || null,
        },
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!plan) return;
    deletePlan.mutate(plan.id);
    onOpenChange(false);
  };

  const pending = createPlan.isPending || updatePlan.isPending;

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
