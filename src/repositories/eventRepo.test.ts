import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn(),
  selectOne: vi.fn(),
}));

import { execute, select, selectOne } from "@/db/client";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByDate,
  getEventsByDateRange,
} from "@/repositories/eventRepo";
import type { CalendarEvent } from "@/types/entities";

const mockExecute = vi.mocked(execute);
const mockSelect = vi.mocked(select);
const mockSelectOne = vi.mocked(selectOne);

const makeEvent = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 1,
  title: "事件",
  type: "independent",
  date: "2026-08-12",
  start_time: null,
  end_time: null,
  task_id: null,
  created_at: "2026-08-12 10:00:00",
  updated_at: "2026-08-12 10:00:00",
  deleted_at: null,
  synced_at: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createEvent", () => {
  it("默认 type 为 independent", async () => {
    const mockEvent = makeEvent({ id: 5 });
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 5 });
    mockSelectOne.mockResolvedValue(mockEvent);

    await createEvent({ title: "开会", date: "2026-08-12" });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO events"),
      ["开会", "independent", "2026-08-12", null, null, null]
    );
  });

  it("带时间的事件", async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 });
    mockSelectOne.mockResolvedValue(makeEvent());
    await createEvent({
      title: "晨会",
      date: "2026-08-12",
      start_time: "09:00",
      end_time: "10:00",
    });
    expect(mockExecute).toHaveBeenCalledWith(expect.any(String), [
      "晨会",
      "independent",
      "2026-08-12",
      "09:00",
      "10:00",
      null,
    ]);
  });
});

describe("updateEvent - 动态 SET 构造", () => {
  it("单字段更新", async () => {
    await updateEvent(1, { title: "改后" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE events SET title = ?, updated_at = datetime('now') WHERE id = ?`,
      ["改后", 1]
    );
  });

  it("多字段更新", async () => {
    await updateEvent(1, { date: "2026-08-13", start_time: "14:00", end_time: "15:00" });
    expect(mockExecute).toHaveBeenCalledWith(
      `UPDATE events SET date = ?, start_time = ?, end_time = ?, updated_at = datetime('now') WHERE id = ?`,
      ["2026-08-13", "14:00", "15:00", 1]
    );
  });

  it("空输入不调用 execute", async () => {
    await updateEvent(1, {});
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe("deleteEvent", () => {
  it("软删除", async () => {
    await deleteEvent(7);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("SET deleted_at"),
      [7]
    );
  });
});

describe("查询函数", () => {
  it("getEventsByDate 按单日查询", async () => {
    mockSelect.mockResolvedValue([]);
    await getEventsByDate("2026-08-12");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("WHERE date = ?"),
      ["2026-08-12"]
    );
  });

  it("getEventsByDateRange 按范围查询", async () => {
    mockSelect.mockResolvedValue([]);
    await getEventsByDateRange("2026-08-11", "2026-08-17");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("date >= ? AND date <= ?"),
      ["2026-08-11", "2026-08-17"]
    );
  });
});
