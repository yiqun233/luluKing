// ============================================================
// 习惯打卡纯函数（连续天数、本周次数）
// ============================================================

import { subDays, format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

/**
 * 计算 daily 型连续天数。
 * 规则：今天没打卡不算断（今天还没结束），从今天或昨天往前数连续打卡日。
 * @param logs 打卡日期数组（yyyy-MM-dd）
 * @param today 今日（yyyy-MM-dd）
 */
export function computeStreak(logs: string[], today: string): number {
  const set = new Set(logs);
  let cursor = parseISO(today);
  if (!set.has(today)) {
    cursor = subDays(cursor, 1);
  }
  let streak = 0;
  while (set.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/**
 * 计算 weekly 型本周已打卡次数。
 * @param logs 打卡日期数组（yyyy-MM-dd）
 * @param today 今日（yyyy-MM-dd），用于确定本周范围
 */
export function computeWeekCount(logs: string[], today: string): number {
  const now = parseISO(today);
  const ws = startOfWeek(now, { weekStartsOn: 1 });
  const we = endOfWeek(now, { weekStartsOn: 1 });
  return logs.filter((d) => {
    try {
      return isWithinInterval(parseISO(d), { start: ws, end: we });
    } catch {
      return false;
    }
  }).length;
}

/** 最近 N 天的打卡记录，返回布尔数组（索引 0 = 最早，N-1 = 今天） */
export function recentDays(logs: string[], today: string, days: number): boolean[] {
  const set = new Set(logs);
  const result: boolean[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(parseISO(today), i), "yyyy-MM-dd");
    result.push(set.has(d));
  }
  return result;
}
