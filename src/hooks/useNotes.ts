// ============================================================
// 笔记 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInboxNotes,
  getKnowledgeNotes,
  getNotesBySubject,
  createNote,
  updateNote,
  deleteNote,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "@/repositories/noteRepo";

export const noteKeys = {
  all: ["notes"] as const,
  inbox: () => ["notes", "inbox"] as const,
  knowledge: () => ["notes", "knowledge"] as const,
  bySubject: (subjectId: number) => ["notes", "subject", subjectId] as const,
};

export function useInboxNotes() {
  return useQuery({ queryKey: noteKeys.inbox(), queryFn: getInboxNotes });
}

export function useKnowledgeNotes() {
  return useQuery({ queryKey: noteKeys.knowledge(), queryFn: getKnowledgeNotes });
}

export function useNotesBySubject(subjectId: number | null) {
  return useQuery({
    queryKey: noteKeys.bySubject(subjectId ?? 0),
    queryFn: () => getNotesBySubject(subjectId!),
    enabled: subjectId != null,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNote(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateNoteInput }) =>
      updateNote(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.all }),
  });
}
