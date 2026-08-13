import { useState } from "react";
import { FolderKanban, Plus, Star, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectEditDialog } from "@/components/projects/ProjectEditDialog";
import { MaterialEditor } from "@/components/projects/MaterialEditor";
import { TaskItem } from "@/components/tasks/TaskItem";
import { useTaskDialog } from "@/components/tasks/TaskDialogProvider";
import {
  useProjects,
  useToggleProjectFocus,
} from "@/hooks/useProjects";
import { useGoals } from "@/hooks/useGoals";
import {
  useTasksByProject,
  useToggleTaskStatus,
  useUpdateTask,
} from "@/hooks/useTasks";
import type { Project, ProjectType } from "@/types/entities";

const statusLabels: Record<string, string> = {
  inactive: "未启动",
  active: "进行中",
  done: "已完成",
  archived: "已归档",
  abandoned: "已放弃",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  done: "secondary",
  inactive: "outline",
  archived: "outline",
  abandoned: "outline",
};

function ProjectCard({
  project,
  goalTitle,
  onEdit,
  onToggleFocus,
}: {
  project: Project;
  goalTitle?: string;
  onEdit: (p: Project) => void;
  onToggleFocus: (p: Project) => void;
}) {
  const { data: tasks = [] } = useTasksByProject(project.id);
  const toggleStatus = useToggleTaskStatus();
  const updateTask = useUpdateTask();
  const { openEdit, openCreate } = useTaskDialog();
  const [showTasks, setShowTasks] = useState(false);

  const openCount = tasks.filter((t) => t.status === "todo").length;

  return (
    <div
      className={`rounded-md border bg-card px-4 py-3 transition-colors hover:bg-accent/40 ${
        project.is_focus ? "ring-1 ring-amber-400/50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleFocus(project)}
          className={`shrink-0 ${
            project.is_focus
              ? "text-amber-500"
              : "text-muted-foreground/30 hover:text-amber-400"
          }`}
          aria-label={project.is_focus ? "取消聚焦" : "设为聚焦"}
        >
          <Star className="h-4 w-4" fill={project.is_focus ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => onEdit(project)}
          className="flex flex-1 items-center justify-between gap-2 text-left"
        >
          <span
            className={`text-sm font-medium ${
              project.status === "done" || project.status === "archived"
                ? "text-muted-foreground line-through"
                : ""
            }`}
          >
            {project.title}
          </span>
          <Badge variant={statusVariant[project.status] ?? "outline"}>
            {statusLabels[project.status]}
          </Badge>
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-3 pl-6 text-xs text-muted-foreground">
        {goalTitle && <span>🎯 {goalTitle}</span>}
        {tasks.length > 0 && (
          <button
            onClick={() => setShowTasks((v) => !v)}
            className="flex items-center gap-0.5 hover:text-foreground"
          >
            {showTasks ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {openCount}/{tasks.length} 个任务
          </button>
        )}
        <button
          onClick={() => openCreate(project.id)}
          className="flex items-center gap-0.5 hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          新建任务
        </button>
      </div>

      {showTasks && tasks.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t pt-2">
          {tasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              onToggle={(id, status) => toggleStatus.mutate({ id, status })}
              onToggleKey={(id, isKey) =>
                updateTask.mutate({ id, input: { is_key: isKey } })
              }
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {project.type === "study" && project.status === "active" && (
        <div className="mt-2 border-t pt-2">
          <MaterialEditor project={project} />
        </div>
      )}
    </div>
  );
}

export function ProjectsPage() {
  const { data: projects = [] } = useProjects();
  const { data: goals = [] } = useGoals();
  const toggleFocus = useToggleProjectFocus();

  const [editing, setEditing] = useState<Project | null>(null);
  const [createType, setCreateType] = useState<ProjectType>("delivery");
  const [dialogOpen, setDialogOpen] = useState(false);

  const goalMap = new Map(goals.map((g) => [g.id, g.title]));

  const openCreate = (type: ProjectType) => {
    setEditing(null);
    setCreateType(type);
    setDialogOpen(true);
  };
  const openEdit = (project: Project) => {
    setEditing(project);
    setDialogOpen(true);
  };
  const handleToggleFocus = (project: Project) => {
    toggleFocus.mutate({ id: project.id, isFocus: project.is_focus ? 0 : 1 });
  };

  const delivery = projects.filter((p) => p.type === "delivery");
  const study = projects.filter((p) => p.type === "study");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">项目</h1>
          <p className="text-xs text-muted-foreground">
            {delivery.length} 个交付 · {study.length} 个学习
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* 交付项目 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderKanban className="h-4 w-4 text-primary" />
                交付项目（{delivery.length}）
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => openCreate("delivery")}
              >
                <Plus className="h-3.5 w-3.5" />
                新建交付
              </Button>
            </div>
            <div className="space-y-2">
              {delivery.length === 0 ? (
                <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                  暂无交付项目
                </p>
              ) : (
                delivery.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    goalTitle={p.goal_id ? goalMap.get(p.goal_id) : undefined}
                    onEdit={openEdit}
                    onToggleFocus={handleToggleFocus}
                  />
                ))
              )}
            </div>
          </section>

          {/* 学习项目 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-primary" />
                学习项目（{study.length}）
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => openCreate("study")}
              >
                <Plus className="h-3.5 w-3.5" />
                新建学习
              </Button>
            </div>
            <div className="space-y-2">
              {study.length === 0 ? (
                <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                  暂无学习项目
                </p>
              ) : (
                study.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    goalTitle={p.goal_id ? goalMap.get(p.goal_id) : undefined}
                    onEdit={openEdit}
                    onToggleFocus={handleToggleFocus}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <ProjectEditDialog
        project={editing}
        defaultType={createType}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
