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
import type { PlanType } from "@/types/entities";

export const planKeys = {
  all: ["plans"] as const,
  byType: (type: PlanType) => ["plans", "type", type] as const,
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
