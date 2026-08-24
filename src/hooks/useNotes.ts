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
  getNotesForLinking,
  getNoteLinksFrom,
  getNoteLinksTo,
  saveKnowledgeNoteWithLinks,
  type CreateNoteInput,
  type UpdateNoteInput,
  type SaveKnowledgeNoteInput,
} from "@/repositories/noteRepo";

export const noteKeys = {
  all: ["notes"] as const,
  inbox: () => ["notes", "inbox"] as const,
  knowledge: () => ["notes", "knowledge"] as const,
  bySubject: (subjectId: number) => ["notes", "subject", subjectId] as const,
  linking: () => ["notes", "linking"] as const,
  linksFrom: (noteId: number) => ["notes", "links", "from", noteId] as const,
  linksTo: (noteId: number) => ["notes", "links", "to", noteId] as const,
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

export function useNotesForLinking() {
  return useQuery({ queryKey: noteKeys.linking(), queryFn: getNotesForLinking });
}

export function useNoteLinksFrom(noteId: number | null) {
  return useQuery({
    queryKey: noteKeys.linksFrom(noteId ?? 0),
    queryFn: () => getNoteLinksFrom(noteId!),
    enabled: noteId != null,
  });
}

export function useNoteLinksTo(noteId: number | null) {
  return useQuery({
    queryKey: noteKeys.linksTo(noteId ?? 0),
    queryFn: () => getNoteLinksTo(noteId!),
    enabled: noteId != null,
  });
}

export function useSaveKnowledgeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveKnowledgeNoteInput) => saveKnowledgeNoteWithLinks(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.all }),
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
