// ============================================================
// 项目与素材 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  getActiveProjects,
  getProjectsByGoal,
  createProject,
  updateProject,
  deleteProject,
  getMaterialsByProject,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateMaterialInput,
  type UpdateMaterialInput,
} from "@/repositories/projectRepo";
import type { Project } from "@/types/entities";

export const projectKeys = {
  all: ["projects"] as const,
  active: () => ["projects", "active"] as const,
  byGoal: (goalId: number) => ["projects", "goal", goalId] as const,
  materials: (projectId: number) => ["projects", "materials", projectId] as const,
};

// ---------- 项目 ----------

export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: getProjects });
}

export function useActiveProjects() {
  return useQuery({ queryKey: projectKeys.active(), queryFn: getActiveProjects });
}

export function useProjectsByGoal(goalId: number | null) {
  return useQuery({
    queryKey: projectKeys.byGoal(goalId ?? 0),
    queryFn: () => getProjectsByGoal(goalId!),
    enabled: goalId != null,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateProjectInput }) =>
      updateProject(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

/** 切换聚焦状态（乐观更新） */
export function useToggleProjectFocus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFocus }: { id: number; isFocus: number }) =>
      updateProject(id, { is_focus: isFocus }),
    onMutate: async ({ id, isFocus }) => {
      await qc.cancelQueries({ queryKey: projectKeys.all });
      const prev = qc.getQueriesData<Project[]>({ queryKey: projectKeys.all });
      qc.setQueriesData<Project[]>({ queryKey: projectKeys.all }, (old) =>
        old?.map((p) => (p.id === id ? { ...p, is_focus: isFocus } : p))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        ctx.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

// ---------- 素材 ----------

export function useMaterialsByProject(projectId: number | null) {
  return useQuery({
    queryKey: projectKeys.materials(projectId ?? 0),
    queryFn: () => getMaterialsByProject(projectId!),
    enabled: projectId != null,
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMaterialInput) => createMaterial(input),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({
        queryKey: projectKeys.materials(vars.project_id),
      }),
  });
}

export function useUpdateMaterial(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateMaterialInput }) =>
      updateMaterial(id, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: projectKeys.materials(projectId) }),
  });
}

export function useDeleteMaterial(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMaterial(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: projectKeys.materials(projectId) }),
  });
}
