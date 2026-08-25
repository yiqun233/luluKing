import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useNotes", () => ({ useUpdateNote: vi.fn() }));
vi.mock("@/hooks/useSubjects", () => ({ useSubjects: vi.fn() }));

import { useUpdateNote } from "@/hooks/useNotes";
import { useSubjects } from "@/hooks/useSubjects";
import { UpgradeNoteDialog } from "@/components/inbox/UpgradeNoteDialog";
import type { Note } from "@/types/entities";

const note: Note = {
  id: 7,
  title: null,
  content: "把这条收件箱内容沉淀下来",
  status: "inbox",
  subject_id: null,
  source: "inbox",
  related_goal_id: null,
  related_project_id: null,
  created_at: "2026-08-25 10:00:00",
  updated_at: "2026-08-25 10:00:00",
  deleted_at: null,
  synced_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSubjects).mockReturnValue({ data: [] } as never);
  vi.mocked(useUpdateNote).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
});

describe("UpgradeNoteDialog", () => {
  it("升级时写入知识状态，且仅在成功后关闭弹窗", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    const onOpenChange = vi.fn();
    vi.mocked(useUpdateNote).mockReturnValue({ mutate, isPending: false } as never);

    render(<UpgradeNoteDialog note={note} open onOpenChange={onOpenChange} />);
    await user.clear(screen.getByLabelText("标题"));
    await user.type(screen.getByLabelText("标题"), "可检索的知识");
    await user.click(screen.getByRole("button", { name: "升级" }));

    expect(mutate).toHaveBeenCalledWith(
      {
        id: 7,
        input: { status: "knowledge", title: "可检索的知识", subject_id: null },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    expect(onOpenChange).not.toHaveBeenCalled();

    const callbacks = mutate.mock.calls[0][1] as { onSuccess: () => void };
    callbacks.onSuccess();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
