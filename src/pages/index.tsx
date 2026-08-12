import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { Repeat } from "lucide-react";

export { DashboardPage } from "./DashboardPage";
export { TasksPage } from "./TasksPage";
export { CalendarPage } from "./CalendarPage";
export { GoalsPage } from "./GoalsPage";
export { ProjectsPage } from "./ProjectsPage";
export { PlanPage } from "./PlanPage";
export { InboxPage } from "./InboxPage";
export { KnowledgePage } from "./KnowledgePage";
export { ReviewPage } from "./ReviewPage";
export { SearchPage } from "./SearchPage";

export function HabitsPage() {
  return (
    <PagePlaceholder
      title="习惯"
      description="二元打卡，每日/每周频率，连续天数，热力图"
      icon={Repeat}
    />
  );
}
