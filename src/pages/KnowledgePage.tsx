import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteEditDialog } from "@/components/knowledge/NoteEditDialog";
import { useSubjects, useCreateSubject } from "@/hooks/useSubjects";
import { useKnowledgeNotes, useNotesBySubject } from "@/hooks/useNotes";
import type { Note } from "@/types/entities";
import { getPositiveSearchParam, withoutSearchParam } from "@/lib/searchNavigation";

export function KnowledgePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: subjects = [] } = useSubjects();
  const { data: allNotes = [] } = useKnowledgeNotes();
  const createSubject = useCreateSubject();

  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const { data: subjectNotes = [] } = useNotesBySubject(selectedSubject);
  const notes = selectedSubject === null ? allNotes : subjectNotes;

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  const [editing, setEditing] = useState<Note | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchOpenId = getPositiveSearchParam(searchParams.get("open"));

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    createSubject.mutate(newSubjectName.trim());
    setNewSubjectName("");
    setAddingSubject(false);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (note: Note) => {
    setEditing(note);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (searchOpenId == null) return;
    const note = allNotes.find((item) => item.id === searchOpenId);
    if (!note) return;
    openEdit(note);
    setSearchParams(
      (current) => withoutSearchParam(current, "open"),
      { replace: true }
    );
  }, [allNotes, searchOpenId, setSearchParams]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">知识库</h1>
          <p className="text-xs text-muted-foreground">
            {allNotes.length} 条知识 · {subjects.length} 个主题
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建笔记
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* 主题 tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                selectedSubject === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              全部（{allNotes.length}）
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubject(s.id)}
                className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                  selectedSubject === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {s.name}
              </button>
            ))}
            {addingSubject ? (
              <Input
                autoFocus
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onBlur={handleAddSubject}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubject();
                  if (e.key === "Escape") {
                    setAddingSubject(false);
                    setNewSubjectName("");
                  }
                }}
                placeholder="主题名"
                className="h-7 w-24 text-sm"
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setAddingSubject(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                主题
              </Button>
            )}
          </div>

          {/* 笔记列表 */}
          {notes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              <BookOpen className="h-8 w-8 opacity-40" />
              {selectedSubject === null
                ? "知识库还空着，新建第一条笔记吧"
                : "该主题下暂无笔记"}
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => openEdit(note)}
                  className="deferred-list-item block w-full rounded-md border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">
                      {note.title || note.content.slice(0, 30) || "无标题"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {note.updated_at.slice(5, 10)}
                    </span>
                  </div>
                  {note.content && (
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap pl-6 text-xs text-muted-foreground">
                      {note.content}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <NoteEditDialog
        note={editing}
        defaultSubjectId={selectedSubject}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
