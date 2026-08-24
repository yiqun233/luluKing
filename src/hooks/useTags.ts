// ============================================================
// 标签 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTags,
  getTagsForManagement,
  getTagsFor,
  getTaggedIds,
  createTag,
  updateTag,
  deleteTag,
  setTags,
  getTagSlice,
  mergeTags,
  type CreateTagInput,
  type UpdateTagInput,
} from "@/repositories/tagRepo";
import type { TaggableType } from "@/types/entities";

export const tagKeys = {
  all: ["tags"] as const,
  for: (type: TaggableType, id: number) =>
    ["tags", "for", type, id] as const,
  tagged: (type: TaggableType, tagId: number) =>
    ["tags", "tagged", type, tagId] as const,
  management: () => ["tags", "management"] as const,
  slice: (tagId: number) => ["tags", "slice", tagId] as const,
};

export function useTags() {
  return useQuery({ queryKey: tagKeys.all, queryFn: getTags });
}

export function useTagsForManagement() {
  return useQuery({ queryKey: tagKeys.management(), queryFn: getTagsForManagement });
}

export function useTagsFor(type: TaggableType, id: number | null) {
  return useQuery({
    queryKey: tagKeys.for(type, id ?? 0),
    queryFn: () => getTagsFor(type, id!),
    enabled: id != null,
  });
}

/** 查某标签下的实体 id 列表（切片视图用） */
export function useTaggedIds(type: TaggableType, tagId: number | null) {
  return useQuery({
    queryKey: tagKeys.tagged(type, tagId ?? 0),
    queryFn: () => getTaggedIds(type, tagId!),
    enabled: tagId != null,
  });
}

export function useTagSlice(tagId: number | null) {
  return useQuery({
    queryKey: tagKeys.slice(tagId ?? 0),
    queryFn: () => getTagSlice(tagId!),
    enabled: tagId != null,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTagInput) => createTag(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTagInput }) =>
      updateTag(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

export function useMergeTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceTagId, targetTagId }: { sourceTagId: number; targetTagId: number }) =>
      mergeTags(sourceTagId, targetTagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

/** 设置某实体的标签（全量替换） */
export function useSetTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      id,
      tagIds,
    }: {
      type: TaggableType;
      id: number;
      tagIds: number[];
    }) => setTags(type, id, tagIds),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: tagKeys.all });
      qc.invalidateQueries({ queryKey: tagKeys.for(vars.type, vars.id) });
    },
  });
}
