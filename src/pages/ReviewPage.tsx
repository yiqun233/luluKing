import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { NotebookPen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewEditDialog } from "@/components/reviews/ReviewEditDialog";
import { useReviewsByType } from "@/hooks/useReviews";
import type { Review, ReviewType } from "@/types/entities";
import { getPositiveSearchParam, withoutSearchParam } from "@/lib/searchNavigation";

const statusLabels: Record<string, string> = {
  draft: "草稿",
  done: "已完成",
  skipped: "已跳过",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  done: "default",
  draft: "secondary",
  skipped: "outline",
};

function periodLabel(review: Review): string {
  if (review.type === "week") {
    return `${review.period_start} ~ ${review.period_end}`;
  }
  return review.period_start.slice(0, 7);
}

export function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<ReviewType>("week");
  const { data: reviews = [] } = useReviewsByType(tab);

  const [editing, setEditing] = useState<Review | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchOpenId = getPositiveSearchParam(searchParams.get("open"));
  const searchReviewType = searchParams.get("type");

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (review: Review) => {
    setEditing(review);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (searchReviewType === "week" || searchReviewType === "month") {
      setTab(searchReviewType);
    }
  }, [searchReviewType]);

  useEffect(() => {
    if (searchOpenId == null) return;
    const review = reviews.find((item) => item.id === searchOpenId);
    if (!review) return;
    openEdit(review);
    setSearchParams(
      (current) => withoutSearchParam(current, "open"),
      { replace: true }
    );
  }, [reviews, searchOpenId, setSearchParams]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">复盘</h1>
          <div className="flex rounded-md border p-0.5">
            {(["week", "month"] as ReviewType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1 text-sm transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "week" ? "周复盘" : "月复盘"}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建{tab === "week" ? "周" : "月"}复盘
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {reviews.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              还没有{tab === "week" ? "周" : "月"}复盘，点击右上角新建
            </p>
          ) : (
            reviews.map((review) => (
              <button
                key={review.id}
                onClick={() => openEdit(review)}
                className="block w-full rounded-md border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <NotebookPen className="h-4 w-4 text-primary" />
                    {periodLabel(review)}
                  </div>
                  <Badge variant={statusVariant[review.status] ?? "outline"}>
                    {statusLabels[review.status]}
                  </Badge>
                </div>
                {review.auto_summary && (
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {review.auto_summary}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <ReviewEditDialog
        review={editing}
        defaultType={tab}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
