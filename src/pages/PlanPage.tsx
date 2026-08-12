import { useState } from "react";
import { CalendarRange, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanEditDialog } from "@/components/plans/PlanEditDialog";
import { usePlansByType } from "@/hooks/usePlans";
import type { Plan, PlanType } from "@/types/entities";

function periodLabel(plan: Plan): string {
  if (plan.type === "week") {
    return `${plan.period_start} ~ ${plan.period_end}`;
  }
  // 月计划只显示 yyyy-MM
  return plan.period_start.slice(0, 7);
}

export function PlanPage() {
  const [tab, setTab] = useState<PlanType>("week");
  const { data: plans = [] } = usePlansByType(tab);

  const [editing, setEditing] = useState<Plan | null>(null);
  const [createType, setCreateType] = useState<PlanType>("week");
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setCreateType(tab);
    setDialogOpen(true);
  };
  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">周期计划</h1>
          <div className="flex rounded-md border p-0.5">
            {(["week", "month"] as PlanType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1 text-sm transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "week" ? "周计划" : "月计划"}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建{tab === "week" ? "周计划" : "月计划"}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {plans.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              还没有{tab === "week" ? "周" : "月"}计划，点击右上角新建
            </p>
          ) : (
            plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => openEdit(plan)}
                className="block w-full rounded-md border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarRange className="h-4 w-4 text-primary" />
                    {periodLabel(plan)}
                  </div>
                  <Badge variant="outline">
                    {plan.type === "week" ? "周" : "月"}
                  </Badge>
                </div>
                {plan.content && (
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                    {plan.content}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <PlanEditDialog
        plan={editing}
        defaultType={createType}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
