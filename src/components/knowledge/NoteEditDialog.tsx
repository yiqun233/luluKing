import { useEffect, useMemo, useRef, useState } from "react";
import { FileWarning, Link2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useDeleteNote,
  useNoteLinksFrom,
  useNoteLinksTo,
  useNotesForLinking,
  useSaveKnowledgeNote,
} from "@/hooks/useNotes";
import { useSubjects } from "@/hooks/useSubjects";
import { useTagsFor, useSetTags } from "@/hooks/useTags";
import { TagSelector } from "@/components/tags/TagSelector";
import { feedback } from "@/components/feedback/FeedbackProvider";
import {
  formatNoteLink,
  getActiveLinkQuery,
  resolveNoteLinks,
} from "@/lib/noteLinks";
import type { Note } from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface NoteEditDialogProps {
  note: Note | null;
  defaultSubjectId?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteEditDialog({
  note,
  defaultSubjectId = null,
  open,
  onOpenChange,
}: NoteEditDialogProps) {
  const isCreate = !note;
  const saveNote = useSaveKnowledgeNote();
  const deleteNote = useDeleteNote();
  const { data: subjects = [] } = useSubjects();
  const { data: linkCandidates = [] } = useNotesForLinking();
  const { data: outgoingLinks = [] } = useNoteLinksFrom(note?.id ?? null);
  const { data: incomingLinks = [] } = useNoteLinksTo(note?.id ?? null);
  const { data: noteTags } = useTagsFor("note", note?.id ?? null);
  const setTagsMutation = useSetTags();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setSubjectId((note?.subject_id ?? defaultSubjectId)?.toString() ?? "");
    setCursor(0);
  }, [open, note, defaultSubjectId]);

  useEffect(() => {
    setTagIds(noteTags?.map((tag) => tag.id) ?? []);
  }, [noteTags]);

  const linkResolution = useMemo(
    () => resolveNoteLinks(content, linkCandidates, note?.id ?? null),
    [content, linkCandidates, note?.id]
  );
  const activeLinkQuery = getActiveLinkQuery(content, cursor);
  const matchingCandidates = useMemo(() => {
    if (activeLinkQuery === null) return [];
    const normalized = activeLinkQuery.toLocaleLowerCase();
    return linkCandidates
      .filter(
        (candidate) =>
          candidate.id !== note?.id &&
          candidate.title.toLocaleLowerCase().includes(normalized)
      )
      .slice(0, 6);
  }, [activeLinkQuery, linkCandidates, note?.id]);

  const updateCursor = (element: HTMLTextAreaElement) => {
    setCursor(element.selectionStart);
  };

  const insertLink = (candidate: (typeof linkCandidates)[number]) => {
    const linkStart = content.slice(0, cursor).lastIndexOf("[[");
    if (linkStart === -1) return;
    const linkText = formatNoteLink(candidate, linkCandidates);
    const nextContent = `${content.slice(0, linkStart)}${linkText}${content.slice(cursor)}`;
    const nextCursor = linkStart + linkText.length;
    setContent(nextContent);
    setCursor(nextCursor);
    window.requestAnimationFrame(() => {
      contentRef.current?.focus();
      contentRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleSave = () => {
    if (!content.trim()) return;
    saveNote.mutate(
      {
        id: note?.id,
        title: title.trim() || null,
        content,
        subjectId: subjectId ? Number(subjectId) : null,
        links: linkResolution.links,
      },
      {
        onSuccess: (savedNote) => {
          setTagsMutation.mutate({ type: "note", id: savedNote.id, tagIds });
          feedback.success("笔记已保存");
          onOpenChange(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!note) return;
    deleteNote.mutate(note.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? "新建笔记" : "编辑笔记"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">标题</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="笔记标题"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">内容</Label>
            <Textarea
              ref={contentRef}
              id="note-content"
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                updateCursor(event.currentTarget);
              }}
              onSelect={(event) => updateCursor(event.currentTarget)}
              rows={14}
              placeholder="输入 [[笔记标题]] 创建双向链接"
              className="resize-y"
            />
            {activeLinkQuery !== null && matchingCandidates.length > 0 && (
              <div className="rounded-md border bg-popover py-1 shadow-sm">
                {matchingCandidates.map((candidate) => {
                  const duplicateCount = linkCandidates.filter(
                    (item) => item.title === candidate.title
                  ).length;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertLink(candidate);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{candidate.title}</span>
                      {duplicateCount > 1 && (
                        <span className="text-xs text-muted-foreground">笔记 #{candidate.id}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {linkResolution.issues.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <div className="flex items-center gap-1 font-medium">
                  <FileWarning className="h-3.5 w-3.5" />
                  {linkResolution.issues.length} 个链接尚未建立关联
                </div>
                <p className="mt-1">
                  {linkResolution.issues.some((issue) => issue.kind === "ambiguous")
                    ? "存在重名笔记，请从自动补全中选择目标；系统会插入带 ID 的确定性链接。"
                    : "没有找到对应笔记；可继续保存文本，之后创建目标笔记再补充链接。"}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-subject">所属主题</Label>
            <select
              id="note-subject"
              className={selectClass}
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              <option value="">无</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>标签</Label>
            <TagSelector value={tagIds} onChange={setTagIds} />
          </div>

          {!isCreate && (
            <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-medium">链接到</p>
                {outgoingLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无链接</p>
                ) : (
                  outgoingLinks.map((link) =>
                    link.available ? (
                      <Link
                        key={`${link.noteId}-${link.linkText}`}
                        to={`/knowledge?open=${link.noteId}`}
                        className="block truncate text-xs text-primary hover:underline"
                      >
                        {link.title || link.linkText}
                      </Link>
                    ) : (
                      <span
                        key={`${link.noteId}-${link.linkText}`}
                        className="block truncate text-xs text-muted-foreground line-through"
                      >
                        已删除：{link.linkText}
                      </span>
                    )
                  )
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">被引用</p>
                {incomingLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无反向链接</p>
                ) : (
                  incomingLinks.map((link) => (
                    <Link
                      key={`${link.noteId}-${link.linkText}`}
                      to={`/knowledge?open=${link.noteId}`}
                      className="block truncate text-xs text-primary hover:underline"
                    >
                      {link.title || link.linkText}
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {!isCreate ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteNote.isPending}
            >
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saveNote.isPending || !content.trim()}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
