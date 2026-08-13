import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/client", () => ({
  execute: vi.fn(),
  select: vi.fn().mockResolvedValue([]),
  selectOne: vi.fn().mockResolvedValue(null),
}));

import App from "@/App";

const renderApp = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
};

describe("App 路由切换", () => {
  it("初始渲染仪表盘，点击菜单切换到任务页", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(
      screen.getByRole("heading", { name: "个人工作台" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "任务" }));
    expect(
      await screen.findByRole("heading", { name: "任务" })
    ).toBeInTheDocument();
  });

  it("切换到习惯页", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("link", { name: "习惯" }));
    expect(
      await screen.findByRole("heading", { name: "习惯" })
    ).toBeInTheDocument();
  });
});
