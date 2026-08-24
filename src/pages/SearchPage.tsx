import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  FolderKanban,
  ListTodo,
  NotebookPen,
  Repeat,
  Search as SearchIcon,
  Tag,
  Target,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { useSearch } from "@/hooks/useSearch";
import {
  getSearchResultPath,
  type SearchResultType,
} from "@/repositories/searchRepo";

const typeMeta: Record<
  SearchResultType,
  { label: string; icon: typeof ListTodo }
> = {
  task: { label: "任务", icon: ListTodo },
  note: { label: "笔记", icon: FileText },
  project: { label: "项目", icon: FolderKanban },
  goal: { label: "目标", icon: Target },
  habit: { label: "习惯", icon: Repeat },
  event: { label: "日程", icon: CalendarDays },
  review: { label: "复盘", icon: NotebookPen },
  tag: { label: "标签", icon: Tag },
};

const typeOrder: SearchResultType[] = [
  "task",
  "note",
  "project",
  "goal",
  "habit",
  "event",
  "review",
  "tag",
];

export function SearchPage() {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(input.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [input]);

  const {
    data: results = [],
    isFetching,
    isError,
    refetch,
  } = useSearch(debounced);

  const groups: Partial<Record<SearchResultType, typeof results>> = {};
  for (const result of results) {
    (groups[result.type] ??= []).push(result);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h1 className="mb-3 text-lg font-semibold">搜索</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="搜索任务、笔记、项目、目标、习惯、日程、复盘、标签…"
            className="pl-9"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          支持筛选：`type:任务`、`tag:性能`、`status:未完成`。每类最多显示 20 条结果。
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {isError ? (
            <QueryErrorState onRetry={refetch} title="搜索失败" />
          ) : debounced.length === 0 ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              输入关键词，或使用筛选语法缩小范围
            </p>
          ) : isFetching ? (
            <p className="py-6 text-center text-sm text-muted-foreground">搜索中…</p>
          ) : results.length === 0 ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              没有找到“{debounced}”相关的内容
            </p>
          ) : (
            typeOrder.map((type) => {
              const resultsByType = groups[type];
              if (!resultsByType || resultsByType.length === 0) return null;
              const meta = typeMeta[type];
              const Icon = meta.icon;
              return (
                <section key={type} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {meta.label}（{resultsByType.length}）
                  </div>
                  <div className="space-y-1">
                    {resultsByType.map((result) => (
                      <Link
                        key={`${result.type}-${result.id}`}
                        to={getSearchResultPath(result)}
                        className="block rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm">{result.title}</span>
                          {result.subtitle && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {result.subtitle}
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
