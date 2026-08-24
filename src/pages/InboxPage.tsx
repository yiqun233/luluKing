import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ListTodo, BookMarked, Trash2, Inbox as InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpgradeNoteDialog } from "@/components/inbox/UpgradeNoteDialog";
import { useInboxNotes, useCreateNote, useDeleteNote } from "@/hooks/useNotes";
import { useCreateTask } from "@/hooks/useTasks";
import type { Note } from "@/types/entities";
import { getPositiveSearchParam, withoutSearchParam } from "@/lib/searchNavigation";

export function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: notes = [] } = useInboxNotes();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const createTask = useCreateTask();

  const [draft, setDraft] = useState("");
  const [upgrading, setUpgrading] = useState<Note | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const searchOpenId = getPositiveSearchParam(searchParams.get("open"));

  const handleQuickAdd = () => {
    if (!draft.trim()) return;
    createNote.mutate({ content: draft.trim() });
    setDraft("");
  };

  const handleToTask = (note: Note) => {
    createTask.mutate({ title: note.content });
    deleteNote.mutate(note.id);
  };

  const handleUpgrade = (note: Note) => {
    setUpgrading(note);
    setUpgradeOpen(true);
  };

  const handleDelete = (note: Note) => {
    deleteNote.mutate(note.id);
  };

  useEffect(() => {
    if (searchOpenId == null) return;
    const note = notes.find((item) => item.id === searchOpenId);
    if (!note) return;
    handleUpgrade(note);
    setSearchParams(
      (current) => withoutSearchParam(current, "open"),
      { replace: true }
    );
  }, [notes, searchOpenId, setSearchParams]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">收件箱</h1>
          <p className="text-xs text-muted-foreground">
            {notes.length} 条待整理
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* 快速记录 */}
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="随手记一条…回车存入收件箱"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickAdd();
              }}
            />
            <Button size="icon" onClick={handleQuickAdd} disabled={!draft.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 列表 */}
          {notes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              <InboxIcon className="h-8 w-8 opacity-40" />
              收件箱空了，随手记点什么吧
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-md border bg-card px-4 py-3"
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {note.content}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {note.created_at.slice(0, 16).replace("T", " ")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => handleToTask(note)}
                        disabled={createTask.isPending}
                        title="转为任务"
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        转任务
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => handleUpgrade(note)}
                        title="升级为知识"
                      >
                        <BookMarked className="h-3.5 w-3.5" />
                        升级知识
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(note)}
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <UpgradeNoteDialog
        note={upgrading}
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </div>
  );
}
