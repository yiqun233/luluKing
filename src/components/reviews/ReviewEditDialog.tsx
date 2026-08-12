import { useEffect, useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
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
import { useCreateReview, useUpdateReview, useDeleteReview } from "@/hooks/useReviews";
import {
  generateReviewSummary,
  formatReviewSummary,
} from "@/repositories/reviewRepo";
import type { Review, ReviewType, ReviewStatus } from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

const QUESTION_TEMPLATE = `1. 本周什么做得好？

2. 什么没做完，为什么？

3. 下周最重要的三件事？`;

interface ReviewEditDialogProps {
  review: Review | null; // null = 新建
  defaultType?: ReviewType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewEditDialog({
  review,
  defaultType = "week",
  open,
  onOpenChange,
}: ReviewEditDialogProps) {
  const isCreate = !review;
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  const [type, setType] = useState<ReviewType>(defaultType);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [autoSummary, setAutoSummary] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<ReviewStatus>("draft");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (review) {
      setType(review.type);
      setPeriodStart(review.period_start);
      setPeriodEnd(review.period_end);
      setAutoSummary(review.auto_summary ?? "");
      setContent(review.content ?? "");
      setStatus(review.status);
    } else {
      const now = new Date();
      const start =
        defaultType === "week"
          ? startOfWeek(now, { weekStartsOn: 1 })
          : startOfMonth(now);
      const end =
        defaultType === "week"
          ? endOfWeek(now, { weekStartsOn: 1 })
          : endOfMonth(now);
      const startStr = fmt(start);
      const endStr = fmt(end);
      setType(defaultType);
      setPeriodStart(startStr);
      setPeriodEnd(endStr);
      setContent(QUESTION_TEMPLATE);
      setStatus("draft");
      setAutoSummary("生成中…");
      generateReviewSummary(startStr, endStr).then((s) =>
        setAutoSummary(formatReviewSummary(s))
      );
    }
  }, [open, review, defaultType]);

  const handleRegenerate = async () => {
    if (!periodStart || !periodEnd) return;
    setRegenerating(true);
    try {
      const s = await generateReviewSummary(periodStart, periodEnd);
      setAutoSummary(formatReviewSummary(s));
    } finally {
      setRegenerating(false);
    }
  };

  const handleSave = () => {
    if (!periodStart || !periodEnd) return;
    if (isCreate) {
      createReview.mutate({
        type,
        period_start: periodStart,
        period_end: periodEnd,
        auto_summary: autoSummary,
        content: content || null,
      });
    } else {
      updateReview.mutate({
        id: review!.id,
        input: {
          type,
          period_start: periodStart,
          period_end: periodEnd,
          auto_summary: autoSummary,
          content: content || null,
          status,
        },
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!review) return;
    deleteReview.mutate(review.id);
    onOpenChange(false);
  };

  const pending = createReview.isPending || updateReview.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? "新建复盘" : "编辑复盘"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rv-type">类型</Label>
              <select
                id="rv-type"
                className={selectClass}
                value={type}
                onChange={(e) => setType(e.target.value as ReviewType)}
                disabled
              >
                <option value="week">周复盘</option>
                <option value="month">月复盘</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rv-start">开始</Label>
              <Input
                id="rv-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rv-end">结束</Label>
              <Input
                id="rv-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {/* 自动摘要 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rv-summary">自动摘要</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 gap-1 px-2 text-xs"
                onClick={handleRegenerate}
                disabled={regenerating || !periodStart || !periodEnd}
              >
                <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
                重新生成
              </Button>
            </div>
            <Textarea
              id="rv-summary"
              value={autoSummary}
              readOnly
              rows={5}
              className="bg-muted/30 text-xs"
            />
          </div>

          {/* 引导问题 / 内容 */}
          <div className="space-y-1.5">
            <Label htmlFor="rv-content">回顾与计划</Label>
            <Textarea
              id="rv-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="回答引导问题，做下周计划…"
              className="resize-y"
            />
          </div>

          {!isCreate && (
            <div className="space-y-1.5">
              <Label htmlFor="rv-status">状态</Label>
              <select
                id="rv-status"
                className={selectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as ReviewStatus)}
              >
                <option value="draft">草稿</option>
                <option value="done">已完成</option>
                <option value="skipped">已跳过</option>
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
              disabled={deleteReview.isPending}
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
            <Button onClick={handleSave} disabled={pending}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
