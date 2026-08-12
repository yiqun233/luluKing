// ============================================================
// 复盘 React Query hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReviews,
  getReviewsByType,
  createReview,
  updateReview,
  deleteReview,
  type CreateReviewInput,
  type UpdateReviewInput,
} from "@/repositories/reviewRepo";
import type { ReviewType } from "@/types/entities";

export const reviewKeys = {
  all: ["reviews"] as const,
  byType: (type: ReviewType) => ["reviews", "type", type] as const,
};

export function useReviews() {
  return useQuery({ queryKey: reviewKeys.all, queryFn: getReviews });
}

export function useReviewsByType(type: ReviewType) {
  return useQuery({
    queryKey: reviewKeys.byType(type),
    queryFn: () => getReviewsByType(type),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => createReview(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateReviewInput }) =>
      updateReview(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}
