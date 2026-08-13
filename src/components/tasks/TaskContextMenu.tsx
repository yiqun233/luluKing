import { useEffect, useRef, useState } from "react";
import {
  Pencil,
  CalendarDays,
  Inbox,
  Star,
  StarOff,
  CheckSquare,
  Trash2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { todayStr } from "@/lib/date";
import type { Task } from "@/types/entities";

export interface ContextMenuState {
  task: Task;
  x: number;
  y: number;
}

interface TaskContextMenuProps {
  state: ContextMenuState | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onSelect: (id: number) => void;
}

/**
 * 任务右键菜单。轻量自建（项目约定不新增 Radix 依赖）。
 * 点击外部/Esc/滚动关闭；靠近视口右下边缘时自动翻转位置。
 */
export function TaskContextMenu({
  state,
  onClose,
  onEdit,
  onSelect,
}: TaskContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // 打开后按实际尺寸校正位置，避免超出视口
  useEffect(() => {
    if (!state) return;
    const el = ref.current;
    const w = el?.offsetWidth ?? 180;
    const h = el?.offsetHeight ?? 240;
    setPos({
      x: Math.min(state.x, window.innerWidth - w - 8),
      y: Math.min(state.y, window.innerHeight - h - 8),
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [state, onClose]);

  if (!state) return null;
  const { task } = state;

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };
  const setPlan = (date: string | null) =>
    updateTask.mutate({ id: task.id, input: { plan_date: date } });

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent";

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-50 min-w-[170px] overflow-hidden rounded-md border bg-popover py-1 shadow-md"
    >
      <button className={itemClass} onClick={run(() => onEdit(task))}>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        编辑
      </button>
      <button className={itemClass} onClick={run(() => setPlan(todayStr()))}>
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        安排到今日
      </button>
      <button
        className={itemClass}
        onClick={run(() =>
          setPlan(format(addDays(new Date(), 1), "yyyy-MM-dd"))
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        安排到明日
      </button>
      <button className={itemClass} onClick={run(() => setPlan(null))}>
        <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
        移入待办池
      </button>

      <div className="my-1 border-t" />

      <button
        className={itemClass}
        onClick={run(() =>
          updateTask.mutate({
            id: task.id,
            input: { is_key: task.is_key === 1 ? 0 : 1 },
          })
        )}
      >
        {task.is_key === 1 ? (
          <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Star className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {task.is_key === 1 ? "取消重点" : "标记重点"}
      </button>
      <button className={itemClass} onClick={run(() => onSelect(task.id))}>
        <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
        选择此任务
      </button>

      <div className="my-1 border-t" />

      <button
        className={`${itemClass} text-destructive`}
        onClick={run(() => deleteTask.mutate(task.id))}
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除
      </button>
    </div>
  );
}
