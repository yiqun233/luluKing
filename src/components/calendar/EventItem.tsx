import { Clock, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/entities";

interface EventItemProps {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  readOnly?: boolean;
}

export function EventItem({ event, onEdit, readOnly }: EventItemProps) {
  const isTaskBlock = event.type === "task_block";
  const timeLabel =
    event.start_time && event.end_time
      ? `${event.start_time}–${event.end_time}`
      : event.start_time
        ? event.start_time
        : "全天";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/40",
        isTaskBlock && "border-primary/30"
      )}
    >
      <div className="flex w-24 shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {timeLabel}
      </div>
      <span className="flex-1 text-sm">{event.title}</span>
      {isTaskBlock && (
        <Badge variant="secondary" className="font-normal">
          任务块
        </Badge>
      )}
      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={() => onEdit(event)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
