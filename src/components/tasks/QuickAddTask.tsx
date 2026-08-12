import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateTask } from "@/hooks/useTasks";
import { todayStr } from "@/lib/date";

interface QuickAddTaskProps {
  /** 默认创建到今日还是待办池 */
  defaultToday?: boolean;
}

export function QuickAddTask({ defaultToday = true }: QuickAddTaskProps) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [toToday, setToToday] = useState(defaultToday);

  const handleAdd = () => {
    const t = title.trim();
    if (!t) return;
    createTask.mutate({
      title: t,
      plan_date: toToday ? todayStr() : null,
    });
    setTitle("");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
        placeholder="快速添加任务，回车创建…"
        className="flex-1"
      />
      <Button
        variant={toToday ? "default" : "secondary"}
        size="sm"
        onClick={() => setToToday((v) => !v)}
        title={toToday ? "当前：加入今日" : "当前：放入待办池"}
      >
        {toToday ? "今日" : "待办池"}
      </Button>
      <Button
        size="icon"
        onClick={handleAdd}
        disabled={!title.trim() || createTask.isPending}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
