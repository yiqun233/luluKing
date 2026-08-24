import { HashRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { TaskDialogProvider } from "@/components/tasks/TaskDialogProvider";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import {
  DashboardPage,
  TasksPage,
  CalendarPage,
  ProjectsPage,
  GoalsPage,
  HabitsPage,
  PlanPage,
  ReviewPage,
  InboxPage,
  KnowledgePage,
  SearchPage,
  SettingsPage,
  TagsPage,
} from "@/pages";

function AppShell() {
  useGlobalShortcuts();
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
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
