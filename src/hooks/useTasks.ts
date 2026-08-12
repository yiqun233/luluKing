// ============================================================
// 任务 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTasksByPlanDate,
  getBacklogTasks,
  getActiveTasks,
  getOverdueTasks,
  getChecklistItems,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/repositories/taskRepo";
import type { Task, TaskStatus } from "@/types/entities";

export const taskKeys = {
  all: ["tasks"] as const,
  today: (date: string) => ["tasks", "today", date] as const,
  backlog: () => ["tasks", "backlog"] as const,
  active: () => ["tasks", "active"] as const,
  overdue: (date: string) => ["tasks", "overdue", date] as const,
  checklist: (taskId: number) => ["tasks", "checklist", taskId] as const,
};

export function useTodayTasks(date: string) {
  return useQuery({
    queryKey: taskKeys.today(date),
    queryFn: () => getTasksByPlanDate(date),
  });
}

export function useBacklogTasks() {
  return useQuery({
    queryKey: taskKeys.backlog(),
    queryFn: getBacklogTasks,
  });
}

export function useActiveTasks() {
  return useQuery({
    queryKey: taskKeys.active(),
    queryFn: getActiveTasks,
  });
}

export function useOverdueTasks(date: string) {
  return useQuery({
    queryKey: taskKeys.overdue(date),
    queryFn: () => getOverdueTasks(date),
  });
}

export function useChecklistItems(taskId: number | null) {
  return useQuery({
    queryKey: taskKeys.checklist(taskId!),
    queryFn: () => getChecklistItems(taskId!),
    enabled: taskId != null,
  });
}

// ========== Mutations ==========

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// 状态切换：乐观更新（勾选体验关键）
export function useToggleTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      // 乐观更新所有 tasks 列表查询（排除 checklist 子任务查询）
      const queries = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      for (const [key, data] of queries) {
        if (key[1] === "checklist") continue;
        if (data) {
          qc.setQueryData(
            key,
            data.map((t) => (t.id === id ? { ...t, status } : t))
          );
        }
      }
    },
    onError: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// ========== 清单子任务 ==========

export function useCreateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: number; title: string }) =>
      createChecklistItem(taskId, title),
    onSuccess: (_data, { taskId }) =>
      qc.invalidateQueries({ queryKey: taskKeys.checklist(taskId) }),
  });
}

export function useToggleChecklistItem(taskId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: number }) =>
      toggleChecklistItem(id, done),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: taskKeys.checklist(taskId) });
      const prev = qc.getQueryData<import("@/types/entities").ChecklistItem[]>(
        taskKeys.checklist(taskId)
      );
      if (prev) {
        qc.setQueryData(
          taskKeys.checklist(taskId),
          prev.map((c) => (c.id === id ? { ...c, done } : c))
        );
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(taskKeys.checklist(taskId), ctx.prev);
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: taskKeys.checklist(taskId) }),
  });
}

export function useDeleteChecklistItem(taskId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChecklistItem(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: taskKeys.checklist(taskId) }),
  });
}
