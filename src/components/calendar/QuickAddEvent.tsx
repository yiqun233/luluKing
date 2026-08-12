import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateEvent } from "@/hooks/useEvents";

interface QuickAddEventProps {
  date: string;
}

export function QuickAddEvent({ date }: QuickAddEventProps) {
  const createEvent = useCreateEvent();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  const handleAdd = () => {
    const t = title.trim();
    if (!t) return;
    createEvent.mutate({
      title: t,
      date,
      start_time: time || null,
      end_time: null,
    });
    setTitle("");
    setTime("");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
        placeholder="添加事件…"
        className="flex-1"
      />
      <Input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="w-28"
      />
      <Button
        size="icon"
        onClick={handleAdd}
        disabled={!title.trim() || createEvent.isPending}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
