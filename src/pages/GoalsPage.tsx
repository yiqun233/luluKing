import { useState } from "react";
import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoalEditDialog } from "@/components/goals/GoalEditDialog";
import { useGoals } from "@/hooks/useGoals";
import type { Goal, GoalPeriodType } from "@/types/entities";

const periodLabels: Record<GoalPeriodType, string> = {
  quarter: "季度目标",
  year: "年度目标",
  long: "长期目标",
};

const statusLabels: Record<string, string> = {
  active: "进行中",
  done: "已完成",
  abandoned: "已放弃",
};

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
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {current}
        {target ? `/${target}` : ""}
      </span>
    </div>
  );
}

export function GoalsPage() {
  const { data: goals = [] } = useGoals();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setDialogOpen(true);
  };

  // 按 period_type 分组
  const groups: Record<GoalPeriodType, Goal[]> = {
    quarter: [],
    year: [],
    long: [],
  };
  for (const g of goals) groups[g.period_type]?.push(g);

  const activeCount = goals.filter((g) => g.status === "active").length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">目标</h1>
          <p className="text-xs text-muted-foreground">{activeCount} 个进行中</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建目标
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {goals.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              还没有目标，点击右上角"新建目标"开始
            </p>
          ) : (
            (Object.keys(groups) as GoalPeriodType[]).map((pt) => {
              const list = groups[pt];
              if (list.length === 0) return null;
              return (
                <section key={pt} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4 text-primary" />
                    {periodLabels[pt]}（{list.length}）
                  </div>
                  <div className="space-y-2">
                    {list.map((goal) => {
                      const pct =
                        goal.progress_target && goal.progress_target > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (goal.progress_current / goal.progress_target) *
                                  100
                              )
                            )
                          : 0;
                      return (
                        <button
                          key={goal.id}
                          onClick={() => openEdit(goal)}
                          className="w-full rounded-md border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-medium ${
                                goal.status === "done"
                                  ? "text-muted-foreground line-through"
                                  : ""
                              }`}
                            >
                              {goal.title}
                            </span>
                            <Badge
                              variant={
                                goal.status === "active"
                                  ? "default"
                                  : goal.status === "done"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {statusLabels[goal.status]}
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <ProgressBar
                              current={goal.progress_current}
                              target={goal.progress_target}
                            />
                          </div>
                          {(goal.period_value || goal.progress_target) && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {goal.period_value && <span>{goal.period_value}</span>}
                              {goal.period_value && goal.progress_target && (
                                <span> · </span>
                              )}
                              {goal.progress_target && <span>{pct}%</span>}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      <GoalEditDialog
        goal={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
