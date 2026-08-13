import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashRouter, Routes, Route, NavLink } from "react-router-dom";

// 最小路由测试：隔离 react-router v7 HashRouter 在 jsdom 下是否正常
function MiniApp() {
  return (
    <HashRouter>
      <NavLink to="/b">去B页</NavLink>
      <Routes>
        <Route path="/" element={<div>首页内容</div>} />
        <Route path="/b" element={<div>B页内容</div>} />
      </Routes>
    </HashRouter>
  );
}

describe("HashRouter 最小路由", () => {
  it("点击 NavLink 切换页面", async () => {
    const user = userEvent.setup();
    render(<MiniApp />);
    expect(screen.getByText("首页内容")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "去B页" }));
    expect(screen.getByText("B页内容")).toBeInTheDocument();
  });
});
