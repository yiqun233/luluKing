import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import {
  FolderKanban,
  Target,
  Repeat,
  CalendarRange,
  NotebookPen,
  Inbox,
  BookOpen,
  Search,
} from "lucide-react";

export { DashboardPage } from "./DashboardPage";
export { TasksPage } from "./TasksPage";
export { CalendarPage } from "./CalendarPage";

export function ProjectsPage() {
  return (
    <PagePlaceholder
      title="项目"
      description="交付型与学习研究型项目，聚焦管理，进度追踪"
      icon={FolderKanban}
    />
  );
}

export function GoalsPage() {
  return (
    <PagePlaceholder
      title="目标"
      description="季度/年度/长期目标，计数型与汇总型进度"
      icon={Target}
    />
  );
}

export function HabitsPage() {
  return (
    <PagePlaceholder
      title="习惯"
      description="二元打卡，每日/每周频率，连续天数，热力图"
      icon={Repeat}
    />
  );
}

export function PlanPage() {
  return (
    <PagePlaceholder
      title="周期计划"
      description="周计划从待办池挑任务排周几，月计划调整聚焦项目"
      icon={CalendarRange}
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
