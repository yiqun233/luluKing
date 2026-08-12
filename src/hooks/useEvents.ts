// ============================================================
// 日程事件 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEventsByDate,
  getEventsByDateRange,
  createEvent,
  updateEvent,
  deleteEvent,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/repositories/eventRepo";

export const eventKeys = {
  all: ["events"] as const,
  date: (date: string) => ["events", "date", date] as const,
  range: (start: string, end: string) =>
    ["events", "range", start, end] as const,
};

export function useTodayEvents(date: string) {
  return useQuery({
    queryKey: eventKeys.date(date),
    queryFn: () => getEventsByDate(date),
  });
}

export function useEventsByDateRange(start: string, end: string) {
  return useQuery({
    queryKey: eventKeys.range(start, end),
    queryFn: () => getEventsByDateRange(start, end),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateEventInput }) =>
      updateEvent(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}
