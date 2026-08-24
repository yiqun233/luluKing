import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { select } from "@/db/client";

export const BACKUP_FORMAT = "luluKing-backup";
export const BACKUP_FORMAT_VERSION = 1;
export const DATABASE_VERSION = 4;
export const BACKUPS_DIR = "luluKing/backups";

type BackupRow = Record<string, unknown>;

export interface BackupData {
  tasks: BackupRow[];
  checklist_items: BackupRow[];
  events: BackupRow[];
  goals: BackupRow[];
  projects: BackupRow[];
  materials: BackupRow[];
  habits: BackupRow[];
  habit_logs: BackupRow[];
  subjects: BackupRow[];
  notes: BackupRow[];
  note_links: BackupRow[];
  tags: BackupRow[];
  taggables: BackupRow[];
  reviews: BackupRow[];
  plans: BackupRow[];
}

export interface BackupDocument {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  appVersion: string;
  databaseVersion: number;
  exportedAt: string;
  attachmentPolicy: "excluded";
  data: BackupData;
}

export interface BackupPreview {
  filename: string;
  path: string;
  appVersion: string;
  databaseVersion: number;
  exportedAt: string;
  attachmentPolicy: "excluded";
  recordCounts: Record<keyof BackupData, number>;
}

export interface RestoreResult {
  restoredRecordCounts: Record<keyof BackupData, number>;
  automaticBackup: BackupPreview;
}

const backupTables = [
  ["tasks", "id"],
  ["checklist_items", "id"],
  ["events", "id"],
  ["goals", "id"],
  ["projects", "id"],
  ["materials", "id"],
  ["habits", "id"],
  ["habit_logs", "id"],
  ["subjects", "id"],
  ["notes", "id"],
  ["note_links", "id"],
  ["tags", "id"],
  ["taggables", "tag_id, taggable_type, taggable_id"],
  ["reviews", "id"],
  ["plans", "id"],
] as const satisfies readonly (readonly [keyof BackupData, string])[];

const backupTableColumns: Record<keyof BackupData, readonly string[]> = {
  tasks: ["id", "title", "status", "plan_date", "due_date", "is_key", "project_id", "notes", "created_at", "updated_at", "deleted_at", "synced_at"],
  checklist_items: ["id", "task_id", "title", "done", "sort_order", "created_at", "updated_at", "deleted_at", "synced_at"],
  events: ["id", "title", "type", "date", "start_time", "end_time", "task_id", "created_at", "updated_at", "deleted_at", "synced_at"],
  goals: ["id", "title", "period_type", "period_value", "progress_type", "progress_target", "progress_current", "status", "notes", "created_at", "updated_at", "deleted_at", "synced_at"],
  projects: ["id", "title", "type", "status", "is_focus", "progress_override", "goal_id", "notes", "created_at", "updated_at", "deleted_at", "synced_at"],
  materials: ["id", "project_id", "type", "title", "author", "pages", "progress", "notes", "created_at", "updated_at", "deleted_at", "synced_at"],
  habits: ["id", "title", "frequency_type", "frequency_target", "goal_id", "status", "pause_until", "best_streak", "created_at", "updated_at", "deleted_at", "synced_at"],
  habit_logs: ["id", "habit_id", "date", "created_at", "synced_at"],
  subjects: ["id", "name", "sort_order", "created_at", "updated_at", "deleted_at", "synced_at"],
  notes: ["id", "title", "content", "status", "subject_id", "source", "related_goal_id", "related_project_id", "created_at", "updated_at", "deleted_at", "synced_at"],
  note_links: ["id", "source_note_id", "target_note_id", "target_type", "target_id", "link_text", "created_at", "synced_at"],
  tags: ["id", "name", "color", "status", "created_at", "updated_at", "deleted_at", "synced_at"],
  taggables: ["tag_id", "taggable_type", "taggable_id", "created_at", "synced_at"],
  reviews: ["id", "type", "period_start", "period_end", "auto_summary", "content", "status", "created_at", "updated_at", "deleted_at", "synced_at"],
  plans: ["id", "type", "period_start", "period_end", "content", "created_at", "updated_at", "deleted_at", "synced_at"],
};

const requiredNumberFields: Partial<Record<keyof BackupData, readonly string[]>> = {
  tasks: ["id", "is_key"],
  checklist_items: ["id", "task_id", "done", "sort_order"],
  events: ["id"],
  goals: ["id", "progress_current"],
  projects: ["id", "is_focus"],
  materials: ["id", "project_id", "progress"],
  habits: ["id", "frequency_target", "best_streak"],
  habit_logs: ["id", "habit_id"],
  subjects: ["id", "sort_order"],
  notes: ["id"],
  note_links: ["id", "source_note_id"],
  tags: ["id"],
  taggables: ["tag_id", "taggable_id"],
  reviews: ["id"],
  plans: ["id"],
};

const nullableNumberFields: Partial<Record<keyof BackupData, readonly string[]>> = {
  tasks: ["project_id"],
  events: ["task_id"],
  goals: ["progress_target"],
  projects: ["progress_override", "goal_id"],
  materials: ["pages"],
  habits: ["goal_id"],
  notes: ["subject_id", "related_goal_id", "related_project_id"],
  note_links: ["target_note_id", "target_id"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumber(row: BackupRow, field: string, label: string): number {
  const value = row[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${label} 的 ${field} 必须是正整数`);
  }
  return value;
}

function getNullableNumber(row: BackupRow, field: string, label: string): number | null {
  const value = row[field];
  if (value === null) return null;
  return getNumber(row, field, label);
}

function getNullableString(row: BackupRow, field: string, label: string): string | null {
  const value = row[field];
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${label} 的 ${field} 必须是文本或空值`);
  return value;
}

function requireValueIn(
  row: BackupRow,
  field: string,
  values: readonly string[],
  label: string
): void {
  const value = getNullableString(row, field, label);
  if (!value || !values.includes(value)) {
    throw new Error(`${label} 的 ${field} 不受支持`);
  }
}

function requireDate(row: BackupRow, field: string, label: string): void {
  const value = getNullableString(row, field, label);
  if (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} 的 ${field} 必须是 YYYY-MM-DD 日期`);
  }
}

function getRows(data: BackupData, table: keyof BackupData): BackupRow[] {
  return data[table];
}

function collectIds(data: BackupData, table: Exclude<keyof BackupData, "taggables">): Set<number> {
  const ids = new Set<number>();
  for (const [index, row] of getRows(data, table).entries()) {
    const id = getNumber(row, "id", `${table}[${index}]`);
    if (ids.has(id)) throw new Error(`${table} 中存在重复 id：${id}`);
    ids.add(id);
  }
  return ids;
}

function requireReference(
  row: BackupRow,
  field: string,
  targetIds: Set<number>,
  label: string,
  nullable = false
): void {
  const id = nullable ? getNullableNumber(row, field, label) : getNumber(row, field, label);
  if (id !== null && !targetIds.has(id)) {
    throw new Error(`${label} 引用了不存在的 ${field}：${id}`);
  }
}

function validateRows(data: BackupData): void {
  for (const [table] of backupTables) {
    for (const [index, row] of getRows(data, table).entries()) {
      if (!isRecord(row)) throw new Error(`${table}[${index}] 必须是对象`);
      for (const column of backupTableColumns[table]) {
        if (!(column in row)) throw new Error(`${table}[${index}] 缺少 ${column}`);
        const value = row[column];
        if (value !== null && typeof value !== "string" && typeof value !== "number") {
          throw new Error(`${table}[${index}] 的 ${column} 格式不正确`);
        }
      }
      for (const column of requiredNumberFields[table] ?? []) {
        if (typeof row[column] !== "number" || !Number.isInteger(row[column])) {
          throw new Error(`${table}[${index}] 的 ${column} 必须是整数`);
        }
      }
      for (const column of nullableNumberFields[table] ?? []) {
        if (row[column] !== null && (typeof row[column] !== "number" || !Number.isInteger(row[column]))) {
          throw new Error(`${table}[${index}] 的 ${column} 必须是整数或空值`);
        }
      }
    }
  }
}

function validateBackupData(data: BackupData): void {
  validateRows(data);

  const ids = {
    tasks: collectIds(data, "tasks"),
    checklist_items: collectIds(data, "checklist_items"),
    events: collectIds(data, "events"),
    goals: collectIds(data, "goals"),
    projects: collectIds(data, "projects"),
    materials: collectIds(data, "materials"),
    habits: collectIds(data, "habits"),
    habit_logs: collectIds(data, "habit_logs"),
    subjects: collectIds(data, "subjects"),
    notes: collectIds(data, "notes"),
    note_links: collectIds(data, "note_links"),
    tags: collectIds(data, "tags"),
    reviews: collectIds(data, "reviews"),
    plans: collectIds(data, "plans"),
  };

  for (const [index, row] of data.tasks.entries()) {
    const label = `tasks[${index}]`;
    requireValueIn(row, "status", ["todo", "done", "abandoned"], label);
    requireReference(row, "project_id", ids.projects, label, true);
    requireDate(row, "plan_date", label);
    requireDate(row, "due_date", label);
  }
  for (const [index, row] of data.checklist_items.entries()) {
    requireReference(row, "task_id", ids.tasks, `checklist_items[${index}]`);
  }
  for (const [index, row] of data.events.entries()) {
    const label = `events[${index}]`;
    requireValueIn(row, "type", ["task_block", "independent"], label);
    requireReference(row, "task_id", ids.tasks, label, true);
    requireDate(row, "date", label);
  }
  for (const [index, row] of data.goals.entries()) {
    const label = `goals[${index}]`;
    requireValueIn(row, "period_type", ["quarter", "year", "long"], label);
    requireValueIn(row, "progress_type", ["count", "aggregate"], label);
    requireValueIn(row, "status", ["active", "done", "abandoned"], label);
  }
  for (const [index, row] of data.projects.entries()) {
    const label = `projects[${index}]`;
    requireValueIn(row, "type", ["delivery", "study"], label);
    requireValueIn(row, "status", ["inactive", "active", "done", "archived", "abandoned"], label);
    requireReference(row, "goal_id", ids.goals, label, true);
  }
  for (const [index, row] of data.materials.entries()) {
    const label = `materials[${index}]`;
    requireValueIn(row, "type", ["book", "article", "video", "doc"], label);
    requireReference(row, "project_id", ids.projects, label);
  }
  for (const [index, row] of data.habits.entries()) {
    const label = `habits[${index}]`;
    requireValueIn(row, "frequency_type", ["daily", "weekly"], label);
    requireValueIn(row, "status", ["active", "paused", "archived"], label);
    requireReference(row, "goal_id", ids.goals, label, true);
  }
  for (const [index, row] of data.habit_logs.entries()) {
    const label = `habit_logs[${index}]`;
    requireReference(row, "habit_id", ids.habits, label);
    requireDate(row, "date", label);
  }
  for (const [index, row] of data.notes.entries()) {
    const label = `notes[${index}]`;
    requireValueIn(row, "status", ["inbox", "knowledge"], label);
    requireValueIn(row, "source", ["inbox", "new", "review", "study"], label);
    requireReference(row, "subject_id", ids.subjects, label, true);
    requireReference(row, "related_goal_id", ids.goals, label, true);
    requireReference(row, "related_project_id", ids.projects, label, true);
  }
  for (const [index, row] of data.note_links.entries()) {
    const label = `note_links[${index}]`;
    requireReference(row, "source_note_id", ids.notes, label);
    requireReference(row, "target_note_id", ids.notes, label, true);
    const targetType = getNullableString(row, "target_type", label);
    const targetId = getNullableNumber(row, "target_id", label);
    if ((targetType === null) !== (targetId === null)) {
      throw new Error(`${label} 的 target_type 与 target_id 必须同时存在或为空`);
    }
    if (targetType && targetId) {
      const targetSets: Record<string, Set<number>> = {
        note: ids.notes,
        goal: ids.goals,
        project: ids.projects,
        task: ids.tasks,
      };
      if (!targetSets[targetType]?.has(targetId)) {
        throw new Error(`${label} 引用了不存在的 ${targetType}：${targetId}`);
      }
    }
  }
  for (const [index, row] of data.tags.entries()) {
    requireValueIn(row, "status", ["active", "archived"], `tags[${index}]`);
  }
  for (const [index, row] of data.taggables.entries()) {
    const label = `taggables[${index}]`;
    requireReference(row, "tag_id", ids.tags, label);
    const type = getNullableString(row, "taggable_type", label);
    const entityId = getNumber(row, "taggable_id", label);
    const targetSets: Record<string, Set<number>> = {
      task: ids.tasks,
      project: ids.projects,
      goal: ids.goals,
      note: ids.notes,
      habit: ids.habits,
      event: ids.events,
      review: ids.reviews,
    };
    if (!type || !targetSets[type]?.has(entityId)) {
      throw new Error(`${label} 引用了不存在的标签实体`);
    }
  }
  for (const [index, row] of data.reviews.entries()) {
    const label = `reviews[${index}]`;
    requireValueIn(row, "type", ["week", "month"], label);
    requireValueIn(row, "status", ["draft", "done", "skipped"], label);
    requireDate(row, "period_start", label);
    requireDate(row, "period_end", label);
  }
  for (const [index, row] of data.plans.entries()) {
    const label = `plans[${index}]`;
    requireValueIn(row, "type", ["week", "month"], label);
    requireDate(row, "period_start", label);
    requireDate(row, "period_end", label);
  }
}

function createFilename(exportedAt: string): string {
  const timestamp = exportedAt.replace(/[-:.]/g, "");
  return `luluKing-backup-${timestamp}.json`;
}

function makePreview(filename: string, document: BackupDocument): BackupPreview {
  const recordCounts = Object.fromEntries(
    backupTables.map(([table]) => [table, document.data[table].length])
  ) as Record<keyof BackupData, number>;

  return {
    filename,
    path: `${BACKUPS_DIR}/${filename}`,
    appVersion: document.appVersion,
    databaseVersion: document.databaseVersion,
    exportedAt: document.exportedAt,
    attachmentPolicy: document.attachmentPolicy,
    recordCounts,
  };
}

async function ensureBackupsDirectory(): Promise<void> {
  if (!(await exists(BACKUPS_DIR, { baseDir: BaseDirectory.AppData }))) {
    await mkdir(BACKUPS_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

async function getBackupData(): Promise<BackupData> {
  const rows = await Promise.all(
    backupTables.map(async ([table, orderBy]) => {
      const data = await select<BackupRow>(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      return [table, data] as const;
    })
  );
  return Object.fromEntries(rows) as unknown as BackupData;
}

export function parseBackup(raw: string): BackupDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("备份文件不是有效的 JSON 格式");
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    throw new Error("不是 luluKing 备份文件");
  }
  if (parsed.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error("该备份格式版本暂不受支持");
  }
  if (
    typeof parsed.appVersion !== "string" ||
    typeof parsed.databaseVersion !== "number" ||
    !Number.isInteger(parsed.databaseVersion) ||
    parsed.databaseVersion < 1 ||
    parsed.databaseVersion > DATABASE_VERSION ||
    typeof parsed.exportedAt !== "string" ||
    Number.isNaN(Date.parse(parsed.exportedAt)) ||
    parsed.attachmentPolicy !== "excluded" ||
    !isRecord(parsed.data)
  ) {
    throw new Error("备份文件缺少必要信息");
  }

  for (const [table] of backupTables) {
    if (!Array.isArray(parsed.data[table])) {
      throw new Error(`备份文件缺少 ${table} 数据`);
    }
  }

  const document = parsed as unknown as BackupDocument;
  validateBackupData(document.data);
  return document;
}

export function previewBackup(filename: string, raw: string): BackupPreview {
  return makePreview(filename, parseBackup(raw));
}

export async function createBackup(): Promise<BackupPreview> {
  const [appVersion, data] = await Promise.all([getVersion(), getBackupData()]);
  const exportedAt = new Date().toISOString();
  const filename = createFilename(exportedAt);
  const document: BackupDocument = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion,
    databaseVersion: DATABASE_VERSION,
    exportedAt,
    attachmentPolicy: "excluded",
    data,
  };

  await ensureBackupsDirectory();
  await writeTextFile(`${BACKUPS_DIR}/${filename}`, JSON.stringify(document, null, 2), {
    baseDir: BaseDirectory.AppData,
    createNew: true,
  });

  return makePreview(filename, document);
}

export async function getLatestBackup(): Promise<BackupPreview | null> {
  if (!(await exists(BACKUPS_DIR, { baseDir: BaseDirectory.AppData }))) {
    return null;
  }

  const filenames = (await readDir(BACKUPS_DIR, { baseDir: BaseDirectory.AppData }))
    .filter((entry) => entry.isFile && /^luluKing-backup-\d{8}T\d{6}\d{3}Z\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const filename = filenames[filenames.length - 1];
  if (!filename) return null;

  const raw = await readTextFile(`${BACKUPS_DIR}/${filename}`, {
    baseDir: BaseDirectory.AppData,
  });
  return makePreview(filename, parseBackup(raw));
}

export async function restoreBackup(raw: string): Promise<RestoreResult> {
  parseBackup(raw);
  const automaticBackup = await createBackup();
  try {
    const result = await invoke<{ restoredRecordCounts: Record<keyof BackupData, number> }>(
      "restore_backup",
      { backupJson: raw }
    );
    return { ...result, automaticBackup };
  } catch (error) {
    const message = error instanceof Error ? error.message : "恢复失败";
    throw new Error(`恢复未完成，当前数据没有被修改。已创建自动安全备份：${automaticBackup.filename}。${message}`);
  }
}
