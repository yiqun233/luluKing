import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Archive, GitMerge, Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { feedback } from "@/components/feedback/FeedbackProvider";
import {
  useCreateTag,
  useMergeTags,
  useTagSlice,
  useTagsForManagement,
  useUpdateTag,
} from "@/hooks/useTags";
import { getPositiveSearchParam, withoutSearchParam } from "@/lib/searchNavigation";
import type { TaggableType } from "@/types/entities";
import type { TagSliceItem } from "@/repositories/tagRepo";

const typeLabels: Record<TaggableType, string> = {
  task: "任务",
  project: "项目",
  goal: "目标",
  note: "笔记",
  habit: "习惯",
  event: "日程",
  review: "复盘",
};

function getTagSlicePath(item: TagSliceItem): string {
  switch (item.type) {
    case "task":
      return `/tasks?open=${item.id}`;
    case "project":
      return `/projects?open=${item.id}`;
    case "goal":
      return `/goals?open=${item.id}`;
    case "note":
      return `${item.noteStatus === "inbox" ? "/inbox" : "/knowledge"}?open=${item.id}`;
    case "habit":
      return `/habits?open=${item.id}`;
    case "event":
      return `/calendar?open=${item.id}&date=${item.eventDate}`;
    case "review":
      return `/review?open=${item.id}&type=${item.reviewType}`;
  }
}

export function TagsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: tags = [] } = useTagsForManagement();
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [sliceType, setSliceType] = useState<TaggableType | "all">("all");
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const searchOpenId = getPositiveSearchParam(searchParams.get("open"));

  const updateTag = useUpdateTag();
  const createTag = useCreateTag();
  const mergeTags = useMergeTags();
  const { data: sliceItems = [] } = useTagSlice(selectedTagId);

  useEffect(() => {
    if (searchOpenId != null && tags.some((tag) => tag.id === searchOpenId)) {
      setSelectedTagId(searchOpenId);
      setSearchParams(
        (current) => withoutSearchParam(current, "open"),
        { replace: true }
      );
      return;
    }
    if (selectedTagId == null && tags.length > 0) setSelectedTagId(tags[0].id);
  }, [searchOpenId, selectedTagId, setSearchParams, tags]);

  const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? null;

  useEffect(() => {
    setName(selectedTag?.name ?? "");
    setSliceType("all");
    setMergeTargetId("");
  }, [selectedTag]);

  const visibleItems = useMemo(
    () =>
      sliceType === "all"
        ? sliceItems
        : sliceItems.filter((item) => item.type === sliceType),
    [sliceItems, sliceType]
  );
  const activeTargets = tags.filter(
    (tag) => tag.status === "active" && tag.id !== selectedTagId
  );

  const handleCreate = () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;
    createTag.mutate(
      { name: trimmedName },
      {
        onSuccess: (tag) => {
          setSelectedTagId(tag.id);
          setNewTagName("");
          feedback.success("标签已创建");
        },
      }
    );
  };

  const handleRename = () => {
    if (!selectedTag || !name.trim() || name.trim() === selectedTag.name) return;
    updateTag.mutate(
      { id: selectedTag.id, input: { name: name.trim() } },
      { onSuccess: () => feedback.success("标签已改名") }
    );
  };

  const handleArchive = () => {
    if (!selectedTag) return;
    updateTag.mutate(
      { id: selectedTag.id, input: { status: "archived" } },
      {
        onSuccess: () => {
          setArchiveConfirmOpen(false);
          feedback.success("标签已归档");
        },
      }
    );
  };

  const handleRestore = () => {
    if (!selectedTag) return;
    updateTag.mutate(
      { id: selectedTag.id, input: { status: "active" } },
      { onSuccess: () => feedback.success("标签已恢复") }
    );
  };

  const handleMerge = () => {
    if (!selectedTag || !mergeTargetId) return;
    mergeTags.mutate(
      { sourceTagId: selectedTag.id, targetTagId: Number(mergeTargetId) },
      {
        onSuccess: () => {
          setMergeConfirmOpen(false);
          setSelectedTagId(Number(mergeTargetId));
          feedback.success("标签关联已合并，来源标签已归档");
        },
      }
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">标签</h1>
        <p className="text-xs text-muted-foreground">用标签横向查看和整理不同类型的信息</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[14rem_1fr]">
          <aside className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreate();
                }}
                placeholder="新标签"
                className="h-8"
              />
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={handleCreate}
                disabled={!newTagName.trim() || createTag.isPending}
                aria-label="新建标签"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 rounded-md border p-1">
              {tags.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">还没有标签</p>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      tag.id === selectedTagId ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    <TagIcon className="h-3.5 w-3.5" />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {tag.status === "archived" && <span className="text-[10px]">已归档</span>}
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-5">
            {!selectedTag ? (
              <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
                选择或创建一个标签后查看关联内容
              </div>
            ) : (
              <>
                <div className="space-y-3 rounded-md border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">标签设置</h2>
                    <span className="text-xs text-muted-foreground">关联 {sliceItems.length} 项内容</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={name} onChange={(event) => setName(event.target.value)} />
                    <Button
                      variant="outline"
                      onClick={handleRename}
                      disabled={
                        updateTag.isPending || !name.trim() || name.trim() === selectedTag.name
                      }
                    >
                      改名
                    </Button>
                    {selectedTag.status === "active" ? (
                      <Button
                        variant="outline"
                        onClick={() => setArchiveConfirmOpen(true)}
                        disabled={updateTag.isPending}
                      >
                        <Archive />
                        归档
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleRestore} disabled={updateTag.isPending}>
                        恢复使用
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={mergeTargetId}
                      onChange={(event) => setMergeTargetId(event.target.value)}
                      className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">合并到其他活动标签…</option>
                      {activeTargets.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      onClick={() => setMergeConfirmOpen(true)}
                      disabled={!mergeTargetId || mergeTags.isPending}
                    >
                      <GitMerge />
                      合并
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    标签默认不物理删除；有引用时请归档或合并，避免历史关联丢失。
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-sm font-medium">关联内容</span>
                    {(["all", ...Object.keys(typeLabels)] as (TaggableType | "all")[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setSliceType(type)}
                        className={`rounded-full px-2.5 py-0.5 text-xs ${
                          sliceType === type
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        }`}
                      >
                        {type === "all" ? `全部（${sliceItems.length}）` : typeLabels[type]}
                      </button>
                    ))}
                  </div>
                  {visibleItems.length === 0 ? (
                    <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                      这个筛选下没有关联内容
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {visibleItems.map((item) => (
                        <Link
                          key={`${item.type}-${item.id}`}
                          to={getTagSlicePath(item)}
                          className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 hover:bg-accent/40"
                        >
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                            {typeLabels[item.type]}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                          <span className="max-w-48 truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="归档标签？"
        description={
          sliceItems.length > 0
            ? `该标签关联了 ${sliceItems.length} 项内容。归档后将不再用于新标记，但历史关联会保留。`
            : "归档后该标签将不再用于新标记。"
        }
        confirmLabel="归档标签"
        onConfirm={handleArchive}
      />
      <ConfirmDialog
        open={mergeConfirmOpen}
        onOpenChange={setMergeConfirmOpen}
        title="合并标签？"
        description="所有关联将迁移到目标标签，重复关联会自动去重，来源标签随后归档。"
        confirmLabel="确认合并"
        pending={mergeTags.isPending}
        onConfirm={handleMerge}
      />
    </div>
  );
}
