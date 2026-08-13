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
import { ChecklistEditor } from "./ChecklistEditor";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useTagsFor, useSetTags } from "@/hooks/useTags";
import { TagSelector } from "@/components/tags/TagSelector";
import type { Task } from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
}: TaskEditDialogProps) {
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const { data: projects = [] } = useProjects();

  const [title, setTitle] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isKey, setIsKey] = useState(0);
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const { data: taskTags = [] } = useTagsFor("task", task?.id ?? null);
  const setTagsMutation = useSetTags();
  const [tagIds, setTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setPlanDate(task.plan_date ?? "");
      setDueDate(task.due_date ?? "");
      setIsKey(task.is_key);
      setProjectId(task.project_id?.toString() ?? "");
      setNotes(task.notes ?? "");
    }
  }, [task]);

  useEffect(() => {
    setTagIds(taskTags.map((t) => t.id));
  }, [taskTags]);

  const handleSave = () => {
    if (!task) return;
    updateTaskMutation.mutate({
      id: task.id,
      input: {
        title,
        plan_date: planDate || null,
        due_date: dueDate || null,
        is_key: isKey,
        project_id: projectId ? Number(projectId) : null,
        notes: notes || null,
      },
    });
    setTagsMutation.mutate({ type: "task", id: task.id, tagIds });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTaskMutation.mutate(task.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑任务</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">标题</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-plan">计划日期</Label>
              <Input
                id="task-plan"
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">截止日期</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-project">所属项目</Label>
            <select
              id="task-project"
              className={selectClass}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">无</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="task-key"
              checked={isKey === 1}
              onCheckedChange={(c) => setIsKey(c ? 1 : 0)}
            />
            <Label htmlFor="task-key" className="cursor-pointer">
              标记为重点任务
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-notes">备注</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="补充说明…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>标签</Label>
            <TagSelector value={tagIds} onChange={setTagIds} />
          </div>

          {task && <ChecklistEditor taskId={task.id} />}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteTaskMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
            删除
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateTaskMutation.isPending}
            >
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
