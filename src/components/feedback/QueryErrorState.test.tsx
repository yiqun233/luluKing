import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";

describe("QueryErrorState", () => {
  it("显示错误说明并支持重试", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<QueryErrorState onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("数据加载失败");
    await user.click(screen.getByRole("button", { name: "重试" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
