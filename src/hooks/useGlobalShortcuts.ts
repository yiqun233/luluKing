import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskDialog } from "@/components/tasks/TaskDialogProvider";

// 数字键 1-9 对应的侧栏路由顺序
const ROUTES = [
  "/",
  "/tasks",
  "/calendar",
  "/projects",
  "/goals",
  "/habits",
  "/plan",
  "/review",
  "/inbox",
];

/**
 * 全局键盘快捷键：
 * - 1~9：切换侧栏页面
 * - n：新建任务
 * - /：跳转搜索
 * 在 input/textarea/contenteditable 内不触发；带修饰键不触发。
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const { openCreate } = useTaskDialog();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;
      if (key >= "1" && key <= "9") {
        const idx = Number(key) - 1;
        if (idx < ROUTES.length) {
          navigate(ROUTES[idx]);
          e.preventDefault();
        }
      } else if (key === "n" || key === "N") {
        openCreate();
        e.preventDefault();
      } else if (key === "/") {
        navigate("/search");
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, openCreate]);
}
