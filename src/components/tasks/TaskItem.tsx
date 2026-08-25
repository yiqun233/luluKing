import { Star, Calendar, Clock, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateLabel, isOverdueDate } from "@/lib/date";
import type { Task } from "@/types/entities";

interface TaskItemProps {
  task: Task;
  onToggle: (id: number, status: "todo" | "done") => void;
  onToggleKey: (id: number, isKey: number) => void;
  onEdit: (task: Task) => void;
  /** 处于批量选择模式时显示选择框 */
  selectionActive?: boolean;
  selected?: boolean;
  /** shiftKey 为 true 时父组件做范围选择 */
  onToggleSelect?: (id: number, shiftKey: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

export function TaskItem({
  task,
  onToggle,
  onToggleKey,
  onEdit,
  selectionActive = false,
  selected = false,
  onToggleSelect,
  onContextMenu,
}: TaskItemProps) {
  const isDone = task.status === "done";
  const isOverdue = task.status === "todo" && isOverdueDate(task.due_date);

  return (
    <div
      onContextMenu={(e) => onContextMenu?.(e, task)}
      className={cn(
        "deferred-list-item group flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/40",
        task.is_key === 1 &&
          "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10",
        selected && "border-primary bg-primary/5 ring-1 ring-primary/40"
      )}
    >
      {selectionActive && (
        <>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.(task.id, false)}
            aria-label={selected ? "取消选择" : "选择任务"}
            className="rounded-sm border-primary/60"
          />
          <div className="h-5 w-px shrink-0 bg-border" />
        </>
      )}

      <Checkbox
        checked={isDone}
        onCheckedChange={(checked) =>
          onToggle(task.id, checked ? "done" : "todo")
        }
        aria-label={isDone ? "标记未完成" : "标记完成"}
      />

      <button
        className="flex-1 text-left"
        onClick={(e) => {
          // Ctrl/Cmd/Shift + 点击进入选择，普通点击编辑
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            onToggleSelect?.(task.id, e.shiftKey);
          } else {
            onEdit(task);
          }
        }}
      >
        <span
          className={cn("text-sm", isDone && "text-muted-foreground line-through")}
        >
          {task.title}
        </span>
      </button>

      {/* 重点标记 */}
      <button
        onClick={() => onToggleKey(task.id, task.is_key === 1 ? 0 : 1)}
        className={cn(
          "shrink-0 rounded p-1 transition-opacity",
          task.is_key === 1
            ? "text-amber-500 opacity-100"
            : "text-muted-foreground opacity-0 hover:opacity-100 group-hover:opacity-100"
        )}
        title={task.is_key === 1 ? "取消重点" : "标记重点"}
      >
        <Star className={cn("h-4 w-4", task.is_key === 1 && "fill-current")} />
      </button>

      {/* 日期标签 */}
      <div className="flex shrink-0 items-center gap-1.5">
        {task.plan_date && (
          <Badge variant="secondary" className="gap-1 font-normal">
            <Calendar className="h-3 w-3" />
            {formatDateLabel(task.plan_date)}
          </Badge>
        )}
        {task.due_date && (
          <Badge
            variant={isOverdue ? "destructive" : "outline"}
            className="gap-1 font-normal"
          >
            <Clock className="h-3 w-3" />
            {formatDateLabel(task.due_date)}
          </Badge>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={() => onEdit(task)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
