// ============================================================
// 主题 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "@/repositories/subjectRepo";

export const subjectKeys = {
  all: ["subjects"] as const,
};

export function useSubjects() {
  return useQuery({ queryKey: subjectKeys.all, queryFn: getSubjects });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createSubject(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: subjectKeys.all }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updateSubject(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: subjectKeys.all }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSubject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: subjectKeys.all }),
  });
}
