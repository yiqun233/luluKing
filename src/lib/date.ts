// ============================================================
// 日期工具
// ============================================================

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

/** 今天的日期，yyyy-MM-dd 格式（本地时区） */
export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** 友好显示日期标签：今天/明天/昨天/N天前/N天后/M月d日 */
export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / 86_400_000
  );
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "明天";
  if (diffDays === -1) return "昨天";
  if (diffDays > 1 && diffDays <= 7) return `${diffDays}天后`;
  if (diffDays < -1 && diffDays >= -7) return `${-diffDays}天前`;
  return format(date, "M月d日", { locale: zhCN });
}

/** 判断日期字符串是否已过期（早于今天） */
export function isOverdueDate(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr < todayStr();
}
