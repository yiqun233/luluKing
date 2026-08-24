import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import {
  Target,
  Plus,
  ChevronDown,
  ChevronRight,
  Repeat,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoalEditDialog } from "@/components/goals/GoalEditDialog";
import { ProjectEditDialog } from "@/components/projects/ProjectEditDialog";
import { useGoals } from "@/hooks/useGoals";
import { useProjects } from "@/hooks/useProjects";
import { useHabits } from "@/hooks/useHabits";
import { useTaskStatsByGoal } from "@/hooks/useTasks";
import type { Goal, GoalPeriodType, Project, Habit } from "@/types/entities";
import { getPositiveSearchParam, withoutSearchParam } from "@/lib/searchNavigation";

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

const projectStatusLabels: Record<string, string> = {
  inactive: "未启动",
  active: "进行中",
  done: "已完成",
  archived: "已归档",
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

/**
 * 目标完成情况参考值。
 * 只做展示，不写回 goal.progress_current（进度仍由你手填，避免自动值误导）。
 */
function GoalReference({
  goalId,
  projects,
}: {
  goalId: number;
  projects: Project[];
}) {
  const { data: taskStats } = useTaskStatsByGoal(goalId);
  const doneProjects = projects.filter((p) => p.status === "done").length;

  if (projects.length === 0 && !taskStats?.total) return null;

  return (
    <div className="rounded bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
      参考：项目 {doneProjects}/{projects.length} 完成
      {taskStats && taskStats.total > 0 && (
        <> · 任务 {taskStats.done}/{taskStats.total} 完成</>
      )}
    </div>
  );
}

/** 目标卡片：可展开查看下属项目与关联习惯 */
function GoalCard({
  goal,
  projects,
  habits,
  onEdit,
  onCreateProject,
}: {
  goal: Goal;
  projects: Project[];
  habits: Habit[];
  onEdit: () => void;
  onCreateProject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct =
    goal.progress_target && goal.progress_target > 0
      ? Math.min(
          100,
          Math.round((goal.progress_current / goal.progress_target) * 100)
        )
      : 0;

  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <span
            className={`text-sm font-medium ${
              goal.status === "done" ? "text-muted-foreground line-through" : ""
            }`}
          >
            {goal.title}
          </span>
        </button>
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

      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
        {goal.period_value && <span>{goal.period_value}</span>}
        {goal.progress_target ? <span>{pct}%</span> : null}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-0.5 hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {projects.length} 个项目 · {habits.length} 个习惯
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 border-t pt-2">
          <GoalReference goalId={goal.id} projects={projects} />

          {projects.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <FolderKanban className="h-3 w-3" />
                项目
              </div>
              {projects.map((p) => (
                <Link
                  key={p.id}
                  to="/projects"
                  className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-accent/40"
                >
                  <span className="truncate">{p.title}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {projectStatusLabels[p.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {habits.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Repeat className="h-3 w-3" />
                习惯
              </div>
              {habits.map((h) => (
                <Link
                  key={h.id}
                  to="/habits"
                  className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-accent/40"
                >
                  <span className="truncate">{h.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {h.frequency_type === "weekly"
                      ? `每周 ${h.frequency_target} 次`
                      : "每日"}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <button
            onClick={onCreateProject}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:bg-accent/40"
          >
            <Plus className="h-3 w-3" />
            为此目标新建项目
          </button>
        </div>
      )}
    </div>
  );
}

export function GoalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: goals = [] } = useGoals();
  const { data: allProjects = [] } = useProjects();
  const { data: allHabits = [] } = useHabits();

  const [editing, setEditing] = useState<Goal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectGoalId, setProjectGoalId] = useState<number | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const searchOpenId = getPositiveSearchParam(searchParams.get("open"));

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setDialogOpen(true);
  };
  const openCreateProject = (goalId: number) => {
    setProjectGoalId(goalId);
    setProjectDialogOpen(true);
  };

  useEffect(() => {
    if (searchOpenId == null) return;
    const goal = goals.find((item) => item.id === searchOpenId);
    if (!goal) return;
    openEdit(goal);
    setSearchParams(
      (current) => withoutSearchParam(current, "open"),
      { replace: true }
    );
  }, [goals, searchOpenId, setSearchParams]);

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
                    {list.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        projects={allProjects.filter(
                          (p) => p.goal_id === goal.id
                        )}
                        habits={allHabits.filter((h) => h.goal_id === goal.id)}
                        onEdit={() => openEdit(goal)}
                        onCreateProject={() => openCreateProject(goal.id)}
                      />
                    ))}
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
      <ProjectEditDialog
        project={null}
        defaultGoalId={projectGoalId}
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
      />
    </div>
  );
}
