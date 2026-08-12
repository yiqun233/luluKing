import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, ListTodo, FileText, FolderKanban, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/hooks/useSearch";
import type { SearchResultType } from "@/repositories/searchRepo";

const typeMeta: Record<
  SearchResultType,
  { label: string; icon: typeof ListTodo; path: string }
> = {
  task: { label: "任务", icon: ListTodo, path: "/tasks" },
  note: { label: "笔记", icon: FileText, path: "/knowledge" },
  project: { label: "项目", icon: FolderKanban, path: "/projects" },
  goal: { label: "目标", icon: Target, path: "/goals" },
};

export function SearchPage() {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");

  // 简单 debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data: results = [], isFetching } = useSearch(debounced);

  // 按类型分组
  const groups: Partial<Record<SearchResultType, typeof results>> = {};
  for (const r of results) {
    (groups[r.type] ??= []).push(r);
  }
  const typeOrder: SearchResultType[] = ["task", "note", "project", "goal"];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h1 className="mb-3 text-lg font-semibold">搜索</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索任务、笔记、项目、目标…"
            className="pl-9"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {debounced.length === 0 ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              输入关键词，跨所有模块搜索
            </p>
          ) : isFetching ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              搜索中…
            </p>
          ) : results.length === 0 ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              没有找到"{debounced}"相关的内容
            </p>
          ) : (
            typeOrder.map((t) => {
              const list = groups[t];
              if (!list || list.length === 0) return null;
              const meta = typeMeta[t];
              const Icon = meta.icon;
              return (
                <section key={t} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {meta.label}（{list.length}）
                  </div>
                  <div className="space-y-1">
                    {list.map((r) => (
                      <Link
                        key={`${r.type}-${r.id}`}
                        to={meta.path}
                        className="block rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm">
                            {r.title}
                          </span>
                          {r.subtitle && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {r.subtitle}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
