import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { TaskDialogProvider } from "@/components/tasks/TaskDialogProvider";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { pageLoaders } from "@/lib/pageLoaders";
import { DashboardPage } from "@/pages/DashboardPage";
import { TasksPage } from "@/pages/TasksPage";

const CalendarPage = lazy(() =>
  pageLoaders.calendar().then(({ CalendarPage }) => ({ default: CalendarPage }))
);
const ProjectsPage = lazy(() =>
  pageLoaders.projects().then(({ ProjectsPage }) => ({ default: ProjectsPage }))
);
const GoalsPage = lazy(() =>
  pageLoaders.goals().then(({ GoalsPage }) => ({ default: GoalsPage }))
);
const HabitsPage = lazy(() =>
  pageLoaders.habits().then(({ HabitsPage }) => ({ default: HabitsPage }))
);
const PlanPage = lazy(() =>
  pageLoaders.plan().then(({ PlanPage }) => ({ default: PlanPage }))
);
const ReviewPage = lazy(() =>
  pageLoaders.review().then(({ ReviewPage }) => ({ default: ReviewPage }))
);
const InboxPage = lazy(() =>
  pageLoaders.inbox().then(({ InboxPage }) => ({ default: InboxPage }))
);
const KnowledgePage = lazy(() =>
  pageLoaders.knowledge().then(({ KnowledgePage }) => ({ default: KnowledgePage }))
);
const SearchPage = lazy(() =>
  pageLoaders.search().then(({ SearchPage }) => ({ default: SearchPage }))
);
const SettingsPage = lazy(() =>
  pageLoaders.settings().then(({ SettingsPage }) => ({ default: SettingsPage }))
);
const TagsPage = lazy(() =>
  pageLoaders.tags().then(({ TagsPage }) => ({ default: TagsPage }))
);

function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      正在加载页面…
    </div>
  );
}

function AppShell() {
  useGlobalShortcuts();
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tags" element={<TagsPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <TaskDialogProvider>
        <AppShell />
      </TaskDialogProvider>
    </HashRouter>
  );
}

export default App;
