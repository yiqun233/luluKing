import { useEffect, useState, useRef } from "react";
import { Trash2, RefreshCw, Sparkles, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { generateReviewDraft } from "@/ai/scenarios/reviewDraft";
import { getAIErrorMessage } from "@/ai/aiClient";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { feedback } from "@/components/feedback/FeedbackProvider";
import { useTagsFor, useSetTags } from "@/hooks/useTags";
import { TagSelector } from "@/components/tags/TagSelector";
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
  const { data: reviewTags } = useTagsFor("review", review?.id ?? null);
  const setTagsMutation = useSetTags();

  const [type, setType] = useState<ReviewType>(defaultType);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [autoSummary, setAutoSummary] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<ReviewStatus>("draft");
  const [regenerating, setRegenerating] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setDraftError("");
    setOverwriteConfirmOpen(false);
    setDeleteConfirmOpen(false);
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
      generateReviewSummary(startStr, endStr)
        .then((summary) => setAutoSummary(formatReviewSummary(summary)))
        .catch(() => {
          setAutoSummary("");
          setDraftError("无法生成数据摘要，请稍后重试");
        });
    }
  }, [open, review, defaultType]);

  useEffect(() => {
    setTagIds(reviewTags?.map((tag) => tag.id) ?? []);
  }, [reviewTags]);

  // 弹窗关闭时中断进行中的 AI 生成
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setDrafting(false);
    }
  }, [open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleGenerateDraft = async (confirmed = false) => {
    if (!autoSummary || drafting) return;
    // 覆盖已有用户内容前确认（模板原文不算用户内容）
    if (
      !confirmed &&
      content.trim() &&
      content.trim() !== QUESTION_TEMPLATE.trim()
    ) {
      setOverwriteConfirmOpen(true);
      return;
    }
    setDraftError("");
    setDrafting(true);
    setContent("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await generateReviewDraft(
        autoSummary,
        type,
        (chunk) => setContent((prev) => prev + chunk),
        ctrl.signal
      );
    } catch (e) {
      // 用户主动中断不算错误
      if (ctrl.signal.aborted) {
        // no-op
      } else {
        setDraftError(getAIErrorMessage(e));
      }
    } finally {
      setDrafting(false);
      abortRef.current = null;
    }
  };

  const handleRegenerate = async () => {
    if (!periodStart || !periodEnd) return;
    setRegenerating(true);
    setDraftError("");
    try {
      const summary = await generateReviewSummary(periodStart, periodEnd);
      setAutoSummary(formatReviewSummary(summary));
    } catch {
      setDraftError("无法生成数据摘要，请稍后重试");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSave = () => {
    if (!periodStart || !periodEnd) return;
    if (isCreate) {
      createReview.mutate(
        {
          type,
          period_start: periodStart,
          period_end: periodEnd,
          auto_summary: autoSummary,
          content: content || null,
        },
        {
          onSuccess: (createdReview) => {
            setTagsMutation.mutate({ type: "review", id: createdReview.id, tagIds });
            feedback.success("复盘已保存");
            onOpenChange(false);
          },
        }
      );
    } else {
      updateReview.mutate(
        {
          id: review!.id,
          input: {
            type,
            period_start: periodStart,
            period_end: periodEnd,
            auto_summary: autoSummary,
            content: content || null,
            status,
          },
        },
        {
          onSuccess: () => {
            setTagsMutation.mutate({ type: "review", id: review!.id, tagIds });
            feedback.success("复盘已保存");
            onOpenChange(false);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!review) return;
    deleteReview.mutate(review.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        feedback.success("复盘已删除");
        onOpenChange(false);
      },
    });
  };

  const confirmOverwrite = () => {
    setOverwriteConfirmOpen(false);
    void handleGenerateDraft(true);
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
            <div className="flex items-center justify-between">
              <Label htmlFor="rv-content">回顾与计划</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 gap-1 px-2 text-xs"
                onClick={
                  drafting
                    ? () => abortRef.current?.abort()
                    : () => void handleGenerateDraft()
                }
                disabled={!autoSummary || autoSummary === "生成中…"}
              >
                {drafting ? (
                  <>
                    <Square className="h-3 w-3" />
                    停止
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-violet-500" />
                    AI 生成草稿
                  </>
                )}
              </Button>
            </div>
            {draftError && (
              <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive">
                <span>{draftError}</span>
                {draftError.includes("未配置") && (
                  <button
                    onClick={() => navigate("/settings")}
                    className="underline underline-offset-2"
                  >
                    去设置
                  </button>
                )}
              </div>
            )}
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
          <div className="space-y-1.5">
            <Label>标签</Label>
            <TagSelector value={tagIds} onChange={setTagIds} />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {!isCreate ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
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
      <ConfirmDialog
        open={overwriteConfirmOpen}
        onOpenChange={setOverwriteConfirmOpen}
        title="覆盖已有内容？"
        description="当前填写的复盘内容将被新的 AI 草稿替换。"
        confirmLabel="覆盖并生成"
        onConfirm={confirmOverwrite}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除复盘？"
        description="删除后复盘将不再显示。请确认这不是误操作。"
        confirmLabel="删除复盘"
        destructive
        pending={deleteReview.isPending}
        onConfirm={handleDelete}
      />
    </Dialog>
  );
}
