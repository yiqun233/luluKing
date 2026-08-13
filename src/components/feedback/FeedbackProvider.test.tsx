import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedbackProvider, feedback } from "@/components/feedback/FeedbackProvider";

describe("FeedbackProvider", () => {
  it("展示成功与失败提示，并提供对应无障碍语义", () => {
    render(
      <FeedbackProvider>
        <div>页面内容</div>
      </FeedbackProvider>
    );

    act(() => feedback.success("任务已保存"));
    act(() => feedback.error("操作失败，数据未被修改"));

    expect(screen.getByRole("status")).toHaveTextContent("任务已保存");
    expect(screen.getByRole("alert")).toHaveTextContent("操作失败，数据未被修改");
  });
});
