import { describe, it, expect } from "vitest";
import { buildReviewPrompt, REVIEW_QUESTIONS } from "@/ai/scenarios/reviewDraft";

describe("buildReviewPrompt", () => {
  it("周复盘：包含摘要、三个问题、本周措辞", () => {
    const prompt = buildReviewPrompt("任务：完成 3/5", "week");
    expect(prompt).toContain("本周");
    expect(prompt).toContain("任务：完成 3/5");
    for (const q of REVIEW_QUESTIONS) {
      expect(prompt).toContain(q);
    }
    // 带编号
    expect(prompt).toContain("1. 本周什么做得好？");
  });

  it("月复盘：包含目标进度评估提示", () => {
    const prompt = buildReviewPrompt("摘要", "month");
    expect(prompt).toContain("本月");
    expect(prompt).toContain("目标进度是否健康");
  });

  it("周复盘不含月度额外提示", () => {
    const prompt = buildReviewPrompt("摘要", "week");
    expect(prompt).not.toContain("目标进度是否健康");
  });
});
