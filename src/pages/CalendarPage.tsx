import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { EventItem } from "@/components/calendar/EventItem";
import { EventEditDialog } from "@/components/calendar/EventEditDialog";
import { QuickAddEvent } from "@/components/calendar/QuickAddEvent";
import { useTodayEvents, useEventsByDateRange } from "@/hooks/useEvents";
import { todayStr } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/entities";
import { getPositiveSearchParam, withoutSearchParam } from "@/lib/searchNavigation";

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchOpenId = getPositiveSearchParam(searchParams.get("open"));
  const searchDate = searchParams.get("date");

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setDialogOpen(true);
  };

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    setSelectedDate(format(addDays(d, delta), "yyyy-MM-dd"));
  };

  // 今日视图数据
  const { data: dayEvents = [] } = useTodayEvents(selectedDate);

  // 本周视图数据
  const weekStart = format(
    startOfWeek(new Date(selectedDate + "T00:00:00"), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const weekEnd = format(
    addDays(new Date(weekStart + "T00:00:00"), 6),
    "yyyy-MM-dd"
  );
  const { data: weekEvents = [] } = useEventsByDateRange(weekStart, weekEnd);

  useEffect(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(searchDate ?? "")) {
      setSelectedDate(searchDate!);
      setView("day");
    }
  }, [searchDate]);

  useEffect(() => {
    if (searchOpenId == null) return;
    const event = dayEvents.find((item) => item.id === searchOpenId);
    if (!event) return;
    openEdit(event);
    setSearchParams(
      (current) => withoutSearchParam(current, "open"),
      { replace: true }
    );
  }, [dayEvents, searchOpenId, setSearchParams]);

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(weekStart + "T00:00:00"), i), "yyyy-MM-dd")
  );

  const dateLabel = format(new Date(selectedDate + "T00:00:00"), "M月d日 EEEE", {
    locale: zhCN,
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">日程</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => shiftDate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(todayStr())}
            >
              今天
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => shiftDate(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <Button
            variant={view === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("day")}
          >
            今日
          </Button>
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("week")}
          >
            本周
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {view === "day" ? (
            <>
              <div className="text-sm font-medium text-muted-foreground">
                {dateLabel}
              </div>
              <QuickAddEvent date={selectedDate} />
              {dayEvents.length === 0 ? (
                <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                  这天没有事件
                </p>
              ) : (
                <div className="space-y-1.5">
                  {dayEvents.map((event) => (
                    <EventItem key={event.id} event={event} onEdit={openEdit} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {weekDays.map((d) => {
                const dayEvents = weekEvents.filter((e) => e.date === d);
                const isToday = d === todayStr();
                return (
                  <div key={d} className="space-y-1.5">
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium",
                        isToday && "text-primary"
                      )}
                    >
                      {format(new Date(d + "T00:00:00"), "E M月d日", {
                        locale: zhCN,
                      })}
                      {isToday && (
                        <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                          今天
                        </span>
                      )}
                    </div>
                    {dayEvents.length === 0 ? (
                      <p className="pl-2 text-xs text-muted-foreground/60">—</p>
                    ) : (
                      dayEvents.map((event) => (
                        <EventItem
                          key={event.id}
                          event={event}
                          onEdit={openEdit}
                        />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <EventEditDialog
        event={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
