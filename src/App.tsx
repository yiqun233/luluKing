import { HashRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
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
} from "@/pages";

function App() {
  return (
    <HashRouter>
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
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
