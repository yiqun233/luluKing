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
import { Checkbox } from "@/components/ui/checkbox";
import {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/useProjects";
import { useActiveGoals } from "@/hooks/useGoals";
import type { Project, ProjectType, ProjectStatus } from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface ProjectEditDialogProps {
  project: Project | null; // null = 新建
  defaultType?: ProjectType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "inactive", label: "未启动" },
  { value: "active", label: "进行中" },
  { value: "done", label: "已完成" },
  { value: "archived", label: "已归档" },
  { value: "abandoned", label: "已放弃" },
];

export function ProjectEditDialog({
  project,
  defaultType = "delivery",
  open,
  onOpenChange,
}: ProjectEditDialogProps) {
  const isCreate = !project;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { data: goals = [] } = useActiveGoals();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProjectType>(defaultType);
  const [goalId, setGoalId] = useState<string>("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [isFocus, setIsFocus] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(project?.title ?? "");
      setType(project?.type ?? defaultType);
      setGoalId(project?.goal_id?.toString() ?? "");
      setStatus(project?.status ?? "active");
      setIsFocus(!!project?.is_focus);
      setNotes(project?.notes ?? "");
    }
  }, [open, project, defaultType]);

  const handleSave = () => {
    if (isCreate) {
      createProject.mutate({
        title,
        type,
        goal_id: goalId ? Number(goalId) : null,
        notes: notes || null,
      });
    } else {
      updateProject.mutate({
        id: project!.id,
        input: {
          title,
          type,
          goal_id: goalId ? Number(goalId) : null,
          status,
          is_focus: isFocus ? 1 : 0,
          notes: notes || null,
        },
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!project) return;
    deleteProject.mutate(project.id);
    onOpenChange(false);
  };

  const pending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? "新建项目" : "编辑项目"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proj-title">标题</Label>
            <Input
              id="proj-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="项目名称"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-type">类型</Label>
              <select
                id="proj-type"
                className={selectClass}
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
                disabled={!isCreate}
              >
                <option value="delivery">交付项目</option>
                <option value="study">学习项目</option>
              </select>
            </div>
            {!isCreate && (
              <div className="space-y-1.5">
                <Label htmlFor="proj-status">状态</Label>
                <select
                  id="proj-status"
                  className={selectClass}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                >
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-goal">关联目标</Label>
            <select
              id="proj-goal"
              className={selectClass}
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
            >
              <option value="">无</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
          {!isCreate && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="proj-focus"
                checked={isFocus}
                onCheckedChange={(v) => setIsFocus(!!v)}
              />
              <Label htmlFor="proj-focus" className="cursor-pointer">
                设为聚焦项目
              </Label>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="proj-notes">备注</Label>
            <Textarea
              id="proj-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="项目说明…"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {!isCreate ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
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
