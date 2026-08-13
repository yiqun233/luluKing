// ============================================================
// 习惯 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getHabits,
  getActiveHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitLogs,
  logHabit,
  unlogHabit,
  type CreateHabitInput,
  type UpdateHabitInput,
} from "@/repositories/habitRepo";

export const habitKeys = {
  all: ["habits"] as const,
  active: () => ["habits", "active"] as const,
  logs: (habitId: number) => ["habits", "logs", habitId] as const,
};

export function useHabits() {
  return useQuery({ queryKey: habitKeys.all, queryFn: getHabits });
}

export function useActiveHabits() {
  return useQuery({ queryKey: habitKeys.active(), queryFn: getActiveHabits });
}

export function useHabitLogs(habitId: number | null) {
  return useQuery({
    queryKey: habitKeys.logs(habitId ?? 0),
    queryFn: () => getHabitLogs(habitId!),
    enabled: habitId != null,
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => createHabit(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateHabitInput }) =>
      updateHabit(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteHabit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

/** 打卡（乐观更新打卡记录缓存） */
export function useLogHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: number; date: string }) =>
      logHabit(habitId, date),
    onMutate: async ({ habitId, date }) => {
      await qc.cancelQueries({ queryKey: habitKeys.logs(habitId) });
      const prev = qc.getQueryData<string[]>(habitKeys.logs(habitId));
      qc.setQueryData<string[]>(habitKeys.logs(habitId), (old) =>
        old ? Array.from(new Set([...old, date])).sort().reverse() : [date]
      );
      return { prev };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(habitKeys.logs(vars.habitId), ctx.prev);
    },
    onSettled: (_d, _e, vars) =>
      qc.invalidateQueries({ queryKey: habitKeys.logs(vars.habitId) }),
  });
}

/** 取消打卡（乐观更新） */
export function useUnlogHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: number; date: string }) =>
      unlogHabit(habitId, date),
    onMutate: async ({ habitId, date }) => {
      await qc.cancelQueries({ queryKey: habitKeys.logs(habitId) });
      const prev = qc.getQueryData<string[]>(habitKeys.logs(habitId));
      qc.setQueryData<string[]>(habitKeys.logs(habitId), (old) =>
        old ? old.filter((d) => d !== date) : []
      );
      return { prev };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(habitKeys.logs(vars.habitId), ctx.prev);
    },
    onSettled: (_d, _e, vars) =>
      qc.invalidateQueries({ queryKey: habitKeys.logs(vars.habitId) }),
  });
}
