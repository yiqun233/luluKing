// ============================================================
// 实体类型定义 - 对应数据库表结构
// ============================================================

// ========== 执行层 ==========

export type TaskStatus = "todo" | "done" | "abandoned";

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  plan_date: string | null;
  due_date: string | null;
  is_key: number; // 0 | 1
  project_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export interface ChecklistItem {
  id: number;
  task_id: number;
  title: string;
  done: number; // 0 | 1
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export type EventType = "task_block" | "independent";

export interface CalendarEvent {
  id: number;
  title: string;
  type: EventType;
  date: string;
  start_time: string | null;
  end_time: string | null;
  task_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

// ========== 组织 / 方向层 ==========

export type ProjectType = "delivery" | "study";
export type ProjectStatus = "inactive" | "active" | "done" | "archived" | "abandoned";

export interface Project {
  id: number;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  is_focus: number; // 0 | 1
  progress_override: number | null;
  goal_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export type MaterialType = "book" | "article" | "video" | "doc";

export interface Material {
  id: number;
  project_id: number;
  type: MaterialType;
  title: string;
  author: string | null;
  pages: number | null;
  progress: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export type GoalPeriodType = "quarter" | "year" | "long";
export type GoalProgressType = "count" | "aggregate";
export type GoalStatus = "active" | "done" | "abandoned";

export interface Goal {
  id: number;
  title: string;
  period_type: GoalPeriodType;
  period_value: string | null;
  progress_type: GoalProgressType;
  progress_target: number | null;
  progress_current: number;
  status: GoalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

// ========== 例行层 ==========

export type HabitFrequencyType = "daily" | "weekly";
export type HabitStatus = "active" | "paused" | "archived";

export interface Habit {
  id: number;
  title: string;
  frequency_type: HabitFrequencyType;
  frequency_target: number;
  goal_id: number | null;
  status: HabitStatus;
  pause_until: string | null;
  best_streak: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  date: string;
  created_at: string;
  synced_at: string | null;
}

// ========== 沉淀层 ==========

export interface Subject {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export type NoteStatus = "inbox" | "knowledge";
export type NoteSource = "inbox" | "new" | "review" | "study";

export interface Note {
  id: number;
  title: string | null;
  content: string;
  status: NoteStatus;
  subject_id: number | null;
  source: NoteSource;
  related_goal_id: number | null;
  related_project_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export interface NoteLink {
  id: number;
  source_note_id: number;
  target_note_id: number | null;
  target_type: string | null; // note / goal / project / task
  target_id: number | null;
  link_text: string;
  created_at: string;
  synced_at: string | null;
}

// ========== 横切层 ==========

export type TagStatus = "active" | "archived";

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  status: TagStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export type TaggableType =
  | "task"
  | "project"
  | "goal"
  | "note"
  | "habit"
  | "event"
  | "review";

export interface Taggable {
  tag_id: number;
  taggable_type: TaggableType;
  taggable_id: number;
  created_at: string;
  synced_at: string | null;
}

export type ReviewType = "week" | "month";
export type ReviewStatus = "draft" | "done" | "skipped";

export interface Review {
  id: number;
  type: ReviewType;
  period_start: string;
  period_end: string;
  auto_summary: string | null;
  content: string | null;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

export type PlanType = "week" | "month";

export interface Plan {
  id: number;
  type: PlanType;
  period_start: string;
  period_end: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string | null;
}

// ========== 文件存储 ==========

export interface FileRecord {
  id: number;
  filename: string;
  original_name: string | null;
  mime_type: string | null;
  size: number | null;
  path: string;
  note_id: number | null;
  created_at: string;
  synced_at: string | null;
}
