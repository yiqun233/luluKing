// ============================================================
// 周期计划 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlans,
  getPlansByType,
  createPlan,
  updatePlan,
  deletePlan,
  type CreatePlanInput,
  type UpdatePlanInput,
} from "@/repositories/planRepo";
import {
  getAvailableWeekPlanTasks,
  getPlanTaskCommitments,
  getReviewPlanTaskCommitments,
  resolvePlanTask,
  saveWeekPlan,
  type ResolvePlanTaskInput,
  type SaveWeekPlanInput,
} from "@/repositories/planTaskRepo";
import type { PlanType } from "@/types/entities";
import { taskKeys } from "@/hooks/useTasks";
import { reviewKeys } from "@/hooks/useReviews";

export const planKeys = {
  all: ["plans"] as const,
  byType: (type: PlanType) => ["plans", "type", type] as const,
  commitments: (planId: number) => ["plans", "commitments", planId] as const,
  availableWeekTasks: () => ["plans", "availableWeekTasks"] as const,
  reviewCommitments: (periodStart: string, periodEnd: string) =>
    ["plans", "reviewCommitments", periodStart, periodEnd] as const,
};

export function usePlans() {
  return useQuery({ queryKey: planKeys.all, queryFn: getPlans });
}

export function usePlansByType(type: PlanType) {
  return useQuery({
    queryKey: planKeys.byType(type),
    queryFn: () => getPlansByType(type),
  });
}

export function usePlanTaskCommitments(planId: number | null) {
  return useQuery({
    queryKey: planKeys.commitments(planId ?? 0),
    queryFn: () => getPlanTaskCommitments(planId!),
    enabled: planId != null,
  });
}

export function useAvailableWeekPlanTasks(enabled = true) {
  return useQuery({
    queryKey: planKeys.availableWeekTasks(),
    queryFn: getAvailableWeekPlanTasks,
    enabled,
  });
}

export function useReviewPlanTaskCommitments(
  periodStart: string,
  periodEnd: string,
  enabled = true
) {
  return useQuery({
    queryKey: planKeys.reviewCommitments(periodStart, periodEnd),
    queryFn: () => getReviewPlanTaskCommitments(periodStart, periodEnd),
    enabled: enabled && Boolean(periodStart) && Boolean(periodEnd),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => createPlan(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePlanInput }) =>
      updatePlan(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export function useSaveWeekPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveWeekPlanInput) => saveWeekPlan(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all });
      qc.invalidateQueries({ queryKey: taskKeys.all });
      qc.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

export function useResolvePlanTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ResolvePlanTaskInput) => resolvePlanTask(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: planKeys.all });
      qc.invalidateQueries({ queryKey: taskKeys.all });
      qc.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}
