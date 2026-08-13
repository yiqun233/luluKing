import { describe, it, expect } from "vitest";
import { computeStreak, computeWeekCount, recentDays } from "@/lib/habit";

describe("computeStreak", () => {
  it("无打卡记录为 0", () => {
    expect(computeStreak([], "2026-08-12")).toBe(0);
  });

  it("今天打卡从今天开始数", () => {
    expect(computeStreak(["2026-08-12"], "2026-08-12")).toBe(1);
  });

  it("连续三天", () => {
    expect(
      computeStreak(["2026-08-12", "2026-08-11", "2026-08-10"], "2026-08-12")
    ).toBe(3);
  });

  it("今天没打从昨天开始数（今天不算断）", () => {
    expect(computeStreak(["2026-08-11", "2026-08-10"], "2026-08-12")).toBe(2);
  });

  it("中间断了只数到断点", () => {
    expect(computeStreak(["2026-08-12", "2026-08-10"], "2026-08-12")).toBe(1);
  });

  it("只有未来记录今天没打为 0", () => {
    expect(computeStreak(["2026-08-13"], "2026-08-12")).toBe(0);
  });

  it("连续五天跨周", () => {
    expect(
      computeStreak(
        ["2026-08-16", "2026-08-15", "2026-08-14", "2026-08-13", "2026-08-12"],
        "2026-08-16"
      )
    ).toBe(5);
  });
});

describe("computeWeekCount", () => {
  // 2026-08-12 周三，本周 08-10(一) ~ 08-16(日)
  it("统计本周内打卡数", () => {
    expect(
      computeWeekCount(["2026-08-10", "2026-08-12", "2026-08-16"], "2026-08-12")
    ).toBe(3);
  });

  it("排除本周外的打卡", () => {
    expect(computeWeekCount(["2026-08-09", "2026-08-17"], "2026-08-12")).toBe(0);
  });

  it("空记录为 0", () => {
    expect(computeWeekCount([], "2026-08-12")).toBe(0);
  });

  it("本周全部打卡", () => {
    const week = [
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
    ];
    expect(computeWeekCount(week, "2026-08-12")).toBe(7);
  });
});

describe("recentDays", () => {
  it("返回 7 天布尔数组，索引 0 最早、6 今天", () => {
    // today=2026-08-12, 7天 = 08-06..08-12
    const result = recentDays(["2026-08-12", "2026-08-10"], "2026-08-12", 7);
    expect(result).toHaveLength(7);
    expect(result[6]).toBe(true); // 08-12 今天
    expect(result[4]).toBe(true); // 08-10
    expect(result[0]).toBe(false); // 08-06
  });

  it("全部未打卡", () => {
    const result = recentDays([], "2026-08-12", 7);
    expect(result.every((d) => d === false)).toBe(true);
  });

  it("指定天数", () => {
    const result = recentDays(["2026-08-12"], "2026-08-12", 3);
    expect(result).toHaveLength(3);
    expect(result[2]).toBe(true);
  });
});
