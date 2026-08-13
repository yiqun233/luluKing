import { useState } from "react";
import { CheckCircle2, Circle, AlertCircle, Tag as TagIcon } from "lucide-react";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TaskBulkBar } from "@/components/tasks/TaskBulkBar";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import {
  TaskContextMenu,
  type ContextMenuState,
} from "@/components/tasks/TaskContextMenu";
import { useTaskDialog } from "@/components/tasks/TaskDialogProvider";
import {
  useTodayTasks,
  useBacklogTasks,
  useOverdueTasks,
  useToggleTaskStatus,
  useUpdateTask,
} from "@/hooks/useTasks";
import { useTags, useTaggedIds } from "@/hooks/useTags";
import { todayStr } from "@/lib/date";
import type { Task } from "@/types/entities";

export function TasksPage() {
  const today = todayStr();
  const todayTasksQuery = useTodayTasks(today);
  const backlogQuery = useBacklogTasks();
  const overdueQuery = useOverdueTasks(today);
  const tagsQuery = useTags();
  const { data: todayTasks = [] } = todayTasksQuery;
  const { data: backlog = [] } = backlogQuery;
  const { data: overdue = [] } = overdueQuery;
  const { data: tags = [] } = tagsQuery;

  const toggleStatus = useToggleTaskStatus();
  const updateTask = useUpdateTask();

  const { openEdit } = useTaskDialog();
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const taggedIdsQuery = useTaggedIds("task", selectedTagId);
  const { data: taggedIds = [] } = taggedIdsQuery;

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lastClickedId, setLastClickedId] = useState<number | null>(null);
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);

  const todayDone = todayTasks.filter((t) => t.status === "done").length;

  // 标签切片：选中标签时过滤所有任务
  const allTasks = [...overdue, ...todayTasks, ...backlog];
  const tagFiltered =
    selectedTagId != null
      ? allTasks.filter((t) => taggedIds.includes(t.id))
      : null;

  // 当前视图中按显示顺序排列的任务（Shift 范围选择依此计算）
  const visibleTasks = tagFiltered ?? [...overdue, ...todayTasks, ...backlog];
  const visibleIds = visibleTasks.map((t) => t.id);

  const toggleSelect = (id: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      // Shift + 点击：选中上次点击到当前之间的全部任务
      if (shiftKey && lastClickedId != null) {
        const from = visibleIds.indexOf(lastClickedId);
        const to = visibleIds.indexOf(id);
        if (from !== -1 && to !== -1) {
          const range = visibleIds.slice(
            Math.min(from, to),
            Math.max(from, to) + 1
          );
          return Array.from(new Set([...prev, ...range]));
        }
      }
      return prev.includes(id)
        ? prev.filter((v) => v !== id)
        : [...prev, id];
    });
    setLastClickedId(id);
  };

  const selectionActive = selectedIds.length > 0;
  const hasQueryError =
    todayTasksQuery.isError ||
    backlogQuery.isError ||
    overdueQuery.isError ||
    tagsQuery.isError ||
    taggedIdsQuery.isError;

  const retryQueries = () => {
    const queries: Promise<unknown>[] = [
      todayTasksQuery.refetch(),
      backlogQuery.refetch(),
      overdueQuery.refetch(),
      tagsQuery.refetch(),
    ];
    if (selectedTagId != null) queries.push(taggedIdsQuery.refetch());
    return Promise.all(queries);
  };

  const renderTask = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      onToggle={(id, status) => toggleStatus.mutate({ id, status })}
      onToggleKey={(id, isKey) =>
        updateTask.mutate({ id, input: { is_key: isKey } })
      }
      onEdit={openEdit}
      selectionActive={selectionActive}
      selected={selectedIds.includes(task.id)}
      onToggleSelect={toggleSelect}
      onContextMenu={(e, t) => {
        e.preventDefault();
        setMenuState({ task: t, x: e.clientX, y: e.clientY });
      }}
    />
  );

  const tagBtnClass = (active: boolean) =>
    `rounded-full px-2.5 py-0.5 text-xs transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-secondary text-secondary-foreground hover:bg-accent"
    }`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">任务</h1>
          <p className="text-xs text-muted-foreground">
            今日 {todayDone}/{todayTasks.length} 完成 · Ctrl/Shift+点击多选 ·
            右键更多操作
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {hasQueryError && <QueryErrorState onRetry={retryQueries} />}
          <QuickAddTask />

          {selectionActive && (
            <TaskBulkBar
              selectedIds={selectedIds}
              allIds={visibleIds}
              onSelectAll={() => setSelectedIds(visibleIds)}
              onClear={() => setSelectedIds([])}
            />
          )}

          {/* 标签切片筛选 */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <TagIcon className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
              <button
                onClick={() => setSelectedTagId(null)}
                className={tagBtnClass(selectedTagId === null)}
              >
                全部
              </button>
              {tags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTagId(t.id)}
                  className={tagBtnClass(selectedTagId === t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {tagFiltered ? (
            <section className="space-y-2">
              <div className="text-sm font-medium">
                标签：{tags.find((t) => t.id === selectedTagId)?.name}（
                {tagFiltered.length}）
              </div>
              {tagFiltered.length === 0 ? (
                <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                  没有带此标签的任务
                </p>
              ) : (
                <div className="space-y-1.5">
                  {tagFiltered.map(renderTask)}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* 逾期 */}
              {overdue.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    逾期（{overdue.length}）
                  </div>
                  <div className="space-y-1.5">{overdue.map(renderTask)}</div>
                </section>
              )}

              {/* 今日清单 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  今日（{todayTasks.length}）
                </div>
                {todayTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    今天还没有安排任务，在上方添加一个吧
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {todayTasks.map(renderTask)}
                  </div>
                )}
              </section>

              {/* 待办池 */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  待办池（{backlog.length}）
                </div>
                {backlog.length === 0 ? (
                  <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    待办池是空的
                  </p>
                ) : (
                  <div className="space-y-1.5">{backlog.map(renderTask)}</div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <TaskContextMenu
        state={menuState}
        onClose={() => setMenuState(null)}
        onEdit={openEdit}
        onSelect={(id) => toggleSelect(id, false)}
      />
    </div>
  );
}
