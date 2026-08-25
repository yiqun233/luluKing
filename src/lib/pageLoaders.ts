// 低频页面的单一动态加载入口：路由渲染与导航预取共用同一模块缓存。
export const pageLoaders = {
  calendar: () => import("@/pages/CalendarPage"),
  projects: () => import("@/pages/ProjectsPage"),
  goals: () => import("@/pages/GoalsPage"),
  habits: () => import("@/pages/HabitsPage"),
  plan: () => import("@/pages/PlanPage"),
  review: () => import("@/pages/ReviewPage"),
  inbox: () => import("@/pages/InboxPage"),
  knowledge: () => import("@/pages/KnowledgePage"),
  search: () => import("@/pages/SearchPage"),
  settings: () => import("@/pages/SettingsPage"),
  tags: () => import("@/pages/TagsPage"),
} as const;

const routeLoaderKeys: Record<string, keyof typeof pageLoaders> = {
  "/calendar": "calendar",
  "/projects": "projects",
  "/goals": "goals",
  "/habits": "habits",
  "/plan": "plan",
  "/review": "review",
  "/inbox": "inbox",
  "/knowledge": "knowledge",
  "/search": "search",
  "/settings": "settings",
  "/tags": "tags",
};

/** 用户将要导航时预取页面模块；已加载模块由浏览器与 Vite 自动复用。 */
export function preloadRoute(path: string): void {
  const key = routeLoaderKeys[path];
  if (key) void pageLoaders[key]();
}
