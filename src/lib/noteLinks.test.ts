import { describe, expect, it } from "vitest";
import {
  formatNoteLink,
  getActiveLinkQuery,
  resolveNoteLinks,
} from "@/lib/noteLinks";

const candidates = [
  { id: 1, title: "性能优化" },
  { id: 2, title: "性能优化" },
  { id: 3, title: "数据库索引" },
];

describe("resolveNoteLinks", () => {
  it("解析唯一标题链接", () => {
    expect(resolveNoteLinks("参见 [[数据库索引]]", candidates, null)).toEqual({
      links: [{ targetNoteId: 3, linkText: "[[数据库索引]]" }],
      issues: [],
    });
  });

  it("重复标题必须带 ID 才能解析", () => {
    const unresolved = resolveNoteLinks("参见 [[性能优化]]", candidates, null);
    expect(unresolved.links).toEqual([]);
    expect(unresolved.issues[0]?.kind).toBe("ambiguous");

    const resolved = resolveNoteLinks("参见 [[性能优化|2]]", candidates, null);
    expect(resolved.links).toEqual([
      { targetNoteId: 2, linkText: "[[性能优化|2]]" },
    ]);
  });

  it("不自动解析自身或不存在的链接", () => {
    const result = resolveNoteLinks("[[性能优化|1]] [[不存在]]", candidates, 1);
    expect(result.links).toEqual([]);
    expect(result.issues).toHaveLength(2);
  });
});

describe("编辑器辅助函数", () => {
  it("识别当前未闭合链接的查询词", () => {
    expect(getActiveLinkQuery("记录 [[数据", 7)).toBe("数据");
    expect(getActiveLinkQuery("记录 [[数据]]", 9)).toBeNull();
  });

  it("重复标题生成带 ID 的确定性链接", () => {
    expect(formatNoteLink(candidates[0], candidates)).toBe("[[性能优化|1]]");
    expect(formatNoteLink(candidates[2], candidates)).toBe("[[数据库索引]]");
  });
});
