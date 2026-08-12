import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { todayStr, formatDateLabel, isOverdueDate } from "@/lib/date";

describe("date 工具", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 固定"今天"为 2026-08-12 10:00
    vi.setSystemTime(new Date(2026, 7, 12, 10, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("todayStr", () => {
    it("返回 yyyy-MM-dd 格式的今天", () => {
      expect(todayStr()).toBe("2026-08-12");
    });
  });

  describe("formatDateLabel", () => {
    it("今天", () => {
      expect(formatDateLabel("2026-08-12")).toBe("今天");
    });
    it("明天", () => {
      expect(formatDateLabel("2026-08-13")).toBe("明天");
    });
    it("昨天", () => {
      expect(formatDateLabel("2026-08-11")).toBe("昨天");
    });
    it("3天后", () => {
      expect(formatDateLabel("2026-08-15")).toBe("3天后");
    });
    it("3天前", () => {
      expect(formatDateLabel("2026-08-09")).toBe("3天前");
    });
    it("恰好7天后仍用相对表达", () => {
      expect(formatDateLabel("2026-08-19")).toBe("7天后");
    });
    it("超过7天后显示月日", () => {
      expect(formatDateLabel("2026-08-20")).toBe("8月20日");
    });
    it("超过7天前显示月日", () => {
      expect(formatDateLabel("2026-08-04")).toBe("8月4日");
    });
    it("跨月显示月日", () => {
      expect(formatDateLabel("2026-09-05")).toBe("9月5日");
    });
    it("跨年显示月日", () => {
      expect(formatDateLabel("2027-01-05")).toBe("1月5日");
    });
  });

  describe("isOverdueDate", () => {
    it("null 返回 false", () => {
      expect(isOverdueDate(null)).toBe(false);
    });
    it("空字符串返回 false", () => {
      expect(isOverdueDate("")).toBe(false);
    });
    it("昨天的日期为逾期", () => {
      expect(isOverdueDate("2026-08-11")).toBe(true);
    });
    it("今天不算逾期", () => {
      expect(isOverdueDate("2026-08-12")).toBe(false);
    });
    it("未来不算逾期", () => {
      expect(isOverdueDate("2026-08-13")).toBe(false);
    });
  });
});
