// ============================================================
// 搜索 React Query hooks
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { searchAll } from "@/repositories/searchRepo";

export const searchKeys = {
  query: (q: string) => ["search", q] as const,
};

export function useSearch(query: string) {
  return useQuery({
    queryKey: searchKeys.query(query),
    queryFn: () => searchAll(query),
    enabled: query.trim().length > 0,
  });
}
