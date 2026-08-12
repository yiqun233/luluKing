import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import {
  Repeat,
  NotebookPen,
  Inbox,
  BookOpen,
  Search,
} from "lucide-react";

export { DashboardPage } from "./DashboardPage";
export { TasksPage } from "./TasksPage";
export { CalendarPage } from "./CalendarPage";
export { GoalsPage } from "./GoalsPage";
export { ProjectsPage } from "./ProjectsPage";
export { PlanPage } from "./PlanPage";

export function HabitsPage() {
  return (
    <PagePlaceholder
      title="习惯"
      description="二元打卡，每日/每周频率，连续天数，热力图"
      icon={Repeat}
    />
  );
}

export function ReviewPage() {
  return (
    <PagePlaceholder
      title="复盘"
      description="五步流程：看摘要、清欠债、清收件箱、回答问题、做下周计划"
      icon={NotebookPen}
    />
  );
}

export function InboxPage() {
  return (
    <PagePlaceholder
      title="收件箱"
      description="随手记录零门槛，三向分流：转任务、升级知识、删除"
      icon={Inbox}
    />
  );
}

export function KnowledgePage() {
  return (
    <PagePlaceholder
      title="知识库"
      description="主题+标签+双向链接，FTS5 全文搜索，结构化沉淀"
      icon={BookOpen}
    />
  );
}

export function SearchPage() {
  return (
    <PagePlaceholder
      title="搜索"
      description="一个搜索框搜所有东西，按类型分组，支持过滤语法"
      icon={Search}
    />
  );
}
