import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useChecklistItems,
  useCreateChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
} from "@/hooks/useTasks";

interface ChecklistEditorProps {
  taskId: number;
}

export function ChecklistEditor({ taskId }: ChecklistEditorProps) {
  const { data: items = [] } = useChecklistItems(taskId);
  const createItem = useCreateChecklistItem();
  const toggleItem = useToggleChecklistItem(taskId);
  const deleteItem = useDeleteChecklistItem(taskId);
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    createItem.mutate({ taskId, title });
    setNewTitle("");
  };

  const doneCount = items.filter((i) => i.done === 1).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">清单</span>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center gap-2">
              <Checkbox
                checked={item.done === 1}
                onCheckedChange={(checked) =>
                  toggleItem.mutate({ id: item.id, done: checked ? 1 : 0 })
                }
              />
              <span
                className={`flex-1 text-sm ${
                  item.done === 1 ? "text-muted-foreground line-through" : ""
                }`}
              >
                {item.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => deleteItem.mutate(item.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="添加子任务…"
          className="h-8 text-sm"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
