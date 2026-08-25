import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateNote } from "@/hooks/useNotes";
import { useSubjects } from "@/hooks/useSubjects";
import { feedback } from "@/components/feedback/FeedbackProvider";
import type { Note } from "@/types/entities";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface UpgradeNoteDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeNoteDialog({
  note,
  open,
  onOpenChange,
}: UpgradeNoteDialogProps) {
  const updateNote = useUpdateNote();
  const { data: subjects = [] } = useSubjects();

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");

  useEffect(() => {
    if (open && note) {
      // 默认用内容前 50 字作标题建议
      setTitle(note.title ?? note.content.slice(0, 50));
      setSubjectId(note.subject_id?.toString() ?? "");
    }
  }, [open, note]);

  const handleSave = () => {
    if (!note) return;
    updateNote.mutate(
      {
        id: note.id,
        input: {
          status: "knowledge",
          title: title.trim() || null,
          subject_id: subjectId ? Number(subjectId) : null,
        },
      },
      {
        onSuccess: () => {
          feedback.success("已升级为知识");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>升级为知识</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {note?.content}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-title">标题</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这条知识起个标题"
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
              <option value="">无（稍后再选）</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {subjects.length === 0 && (
              <p className="text-xs text-amber-600">
                还没有主题，可先到知识库创建主题。
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={updateNote.isPending}>
            升级
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
