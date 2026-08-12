import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderKanban,
  Target,
  Repeat,
  CalendarRange,
  NotebookPen,
  Inbox,
  BookOpen,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "",
    items: [{ to: "/", label: "仪表盘", icon: LayoutDashboard }],
  },
  {
    title: "做事",
    items: [
      { to: "/tasks", label: "任务", icon: CheckSquare },
      { to: "/calendar", label: "日程", icon: Calendar },
      { to: "/projects", label: "项目", icon: FolderKanban },
      { to: "/goals", label: "目标", icon: Target },
      { to: "/habits", label: "习惯", icon: Repeat },
    ],
  },
  {
    title: "规划",
    items: [
      { to: "/plan", label: "周期计划", icon: CalendarRange },
      { to: "/review", label: "复盘", icon: NotebookPen },
    ],
  },
  {
    title: "沉淀",
    items: [
      { to: "/inbox", label: "收件箱", icon: Inbox },
      { to: "/knowledge", label: "知识库", icon: BookOpen },
    ],
  },
  {
    title: "",
    items: [{ to: "/search", label: "搜索", icon: Search }],
  },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Logo / 标题 */}
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-sm font-bold text-primary-foreground">L</span>
        </div>
        <span className="text-sm font-semibold">个人工作台</span>
      </div>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navSections.map((section, i) => (
          <div key={i} className="mb-4">
            {section.title && (
              <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
