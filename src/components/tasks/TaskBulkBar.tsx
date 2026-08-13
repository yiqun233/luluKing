import { X, Trash2, Star, CalendarDays, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBulkUpdateTasks, useBulkDeleteTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { todayStr } from "@/lib/date";
import { format, addDays } from "date-fns";

const selectClass =
  "h-7 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface TaskBulkBarProps {
  selectedIds: number[];
  /** 当前视图内全部任务 id，用于全选 */
  allIds: number[];
  onSelectAll: () => void;
  onClear: () => void;
}

/** 批量操作栏：选中任务后出现 */
export function TaskBulkBar({
  selectedIds,
  allIds,
  onSelectAll,
  onClear,
}: TaskBulkBarProps) {
  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();
  const { data: projects = [] } = useProjects();

  const count = selectedIds.length;
  const pending = bulkUpdate.isPending || bulkDelete.isPending;
  const allSelected = count > 0 && count === allIds.length;

  const apply = (input: Parameters<typeof bulkUpdate.mutate>[0]["input"]) => {
    bulkUpdate.mutate({ ids: selectedIds, input });
  };

  const handleDelete = () => {
    bulkDelete.mutate(selectedIds, { onSuccess: onClear });
  };

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs backdrop-blur">
      <span className="font-medium">已选 {count} 个</span>

      {!allSelected && (
        <button onClick={onSelectAll} className="text-primary hover:underline">
          全选（{allIds.length}）
        </button>
      )}

      <div className="h-4 w-px bg-border" />

      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        disabled={pending}
        onClick={() => apply({ plan_date: todayStr() })}
      >
        <CalendarDays className="h-3 w-3" />
        今日
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        disabled={pending}
        onClick={() =>
          apply({ plan_date: format(addDays(new Date(), 1), "yyyy-MM-dd") })
        }
      >
        明日
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        disabled={pending}
        onClick={() => apply({ plan_date: null })}
      >
        <Inbox className="h-3 w-3" />
        待办池
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        disabled={pending}
        onClick={() => apply({ is_key: 1 })}
      >
        <Star className="h-3 w-3" />
        设重点
      </Button>

      <select
        className={selectClass}
        value=""
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") return;
          apply({ project_id: v === "none" ? null : Number(v) });
          e.target.value = "";
        }}
      >
        <option value="">移到项目…</option>
        <option value="none">无项目</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      <Button
        size="sm"
        variant="destructive"
        className="h-7 gap-1 text-xs"
        disabled={pending}
        onClick={handleDelete}
      >
        <Trash2 className="h-3 w-3" />
        删除
      </Button>

      <button
        onClick={onClear}
        className="ml-auto flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
        退出选择
      </button>
    </div>
  );
}
