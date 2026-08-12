// ============================================================
// 目标 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGoals,
  getActiveGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "@/repositories/goalRepo";

export const goalKeys = {
  all: ["goals"] as const,
  active: () => ["goals", "active"] as const,
};

export function useGoals() {
  return useQuery({ queryKey: goalKeys.all, queryFn: getGoals });
}

export function useActiveGoals() {
  return useQuery({ queryKey: goalKeys.active(), queryFn: getActiveGoals });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateGoalInput }) =>
      updateGoal(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  });
}
