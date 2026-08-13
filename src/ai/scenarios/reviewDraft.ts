// ============================================================
// 复盘 AI 草稿（架构文档 6.2 第一个场景）
// 把本期自动摘要喂给 AI，生成三个引导问题的回答草稿
// ============================================================

import { callAI } from "@/ai/aiClient";
import type { ReviewType } from "@/types/entities";

/** 三个固定引导问题（业务设计 4.8.4） */
export const REVIEW_QUESTIONS = [
  "本周什么做得好？",
  "什么没做完，为什么？",
  "下周最重要的三件事？",
] as const;

const MONTH_EXTRA = "月复盘额外：请评估各目标进度是否健康，方向是否需要调整。";

const SYSTEM_PROMPT =
  "你是一个个人复盘助手。根据用户提供的本周数据，简洁地回答复盘引导问题。" +
  "要求：用中文，每问 2-4 句，诚实归因不套话，给出可执行的下一步。按原问题编号分点回答。";

/**
 * 构造复盘草稿的 prompt（纯函数，可单测）
 * @param summaryText formatReviewSummary 产出的摘要文本
 * @param type 复盘类型
 */
export function buildReviewPrompt(
  summaryText: string,
  type: ReviewType
): string {
  const periodLabel = type === "week" ? "本周" : "本月";
  const questions = REVIEW_QUESTIONS.map(
    (q, i) => `${i + 1}. ${q}`
  ).join("\n");
  const extra = type === "month" ? `\n${MONTH_EXTRA}` : "";
  return (
    `以下是${periodLabel}的数据摘要：\n\n${summaryText}\n\n` +
    `请据此回答以下问题：\n${questions}${extra}`
  );
}

/**
 * 调用 AI 生成复盘草稿
 * @param summaryText 摘要文本
 * @param type 复盘类型
 * @param onStream 流式回调，逐块接收增量文本
 * @param signal 中断信号
 */
export async function generateReviewDraft(
  summaryText: string,
  type: ReviewType,
  onStream?: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const prompt = buildReviewPrompt(summaryText, type);
  return callAI(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.6,
    onStream,
    signal,
  });
}
