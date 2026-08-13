import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import { useSubjects } from "@/hooks/useSubjects";
import { useTagsFor, useSetTags } from "@/hooks/useTags";
import { TagSelector } from "@/components/tags/TagSelector";
import type { Note } from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface NoteEditDialogProps {
  note: Note | null; // null = 新建
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
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { data: subjects = [] } = useSubjects();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const { data: noteTags = [] } = useTagsFor("note", note?.id ?? null);
  const setTagsMutation = useSetTags();
  const [tagIds, setTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? "");
      setContent(note?.content ?? "");
      setSubjectId(
        (note?.subject_id ?? defaultSubjectId)?.toString() ?? ""
      );
    }
  }, [open, note, defaultSubjectId]);

  useEffect(() => {
    setTagIds(noteTags.map((t) => t.id));
  }, [noteTags]);

  const handleSave = () => {
    if (isCreate) {
      createNote.mutate({
        title: title.trim() || null,
        content: content || "",
        status: "knowledge",
        subject_id: subjectId ? Number(subjectId) : null,
        source: "new",
      });
    } else {
      updateNote.mutate({
        id: note!.id,
        input: {
          title: title.trim() || null,
          content,
          subject_id: subjectId ? Number(subjectId) : null,
        },
      });
      setTagsMutation.mutate({ type: "note", id: note!.id, tagIds });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!note) return;
    deleteNote.mutate(note.id);
    onOpenChange(false);
  };

  const pending = createNote.isPending || updateNote.isPending;

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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="笔记标题"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">内容</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              placeholder="支持 [[条目名]] 双向链接语法"
              className="resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-subject">所属主题</Label>
            <select
              id="note-subject"
              className={selectClass}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">无</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {!isCreate && (
            <div className="space-y-1.5">
              <Label>标签</Label>
              <TagSelector value={tagIds} onChange={setTagIds} />
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
            <Button
              onClick={handleSave}
              disabled={pending || !content.trim()}
            >
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
