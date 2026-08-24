import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/app", () => ({ getVersion: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppData: "appData" },
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));
vi.mock("@/db/client", () => ({ select: vi.fn() }));

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
import {
  BACKUPS_DIR,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  createBackup,
  getLatestBackup,
  parseBackup,
  previewBackup,
  restoreBackup,
} from "@/backup/backupService";

const mockGetVersion = vi.mocked(getVersion);
const mockInvoke = vi.mocked(invoke);
const mockExists = vi.mocked(exists);
const mockMkdir = vi.mocked(mkdir);
const mockReadDir = vi.mocked(readDir);
const mockReadTextFile = vi.mocked(readTextFile);
const mockWriteTextFile = vi.mocked(writeTextFile);
const mockSelect = vi.mocked(select);

const backupJson = JSON.stringify({
  format: BACKUP_FORMAT,
  formatVersion: BACKUP_FORMAT_VERSION,
  appVersion: "0.1.0",
  databaseVersion: 4,
  exportedAt: "2026-08-13T08:00:00.000Z",
  attachmentPolicy: "excluded",
  data: {
    tasks: [],
    checklist_items: [],
    events: [],
    goals: [],
    projects: [],
    materials: [],
    habits: [],
    habit_logs: [],
    subjects: [],
    notes: [],
    note_links: [],
    tags: [],
    taggables: [],
    reviews: [],
    plans: [],
  },
});

function createInvalidBackup(mutator: (backup: Record<string, unknown>) => void): string {
  const backup = JSON.parse(backupJson) as Record<string, unknown>;
  mutator(backup);
  return JSON.stringify(backup);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetVersion.mockResolvedValue("0.1.0");
  mockExists.mockResolvedValue(true);
  mockSelect.mockResolvedValue([]);
});

describe("createBackup", () => {
  it("导出全部业务表，不读取附件和同步状态", async () => {
    const preview = await createBackup();

    expect(mockSelect).toHaveBeenCalledTimes(15);
    expect(mockSelect).toHaveBeenCalledWith("SELECT * FROM tasks ORDER BY id");
    expect(mockSelect).toHaveBeenCalledWith(
      "SELECT * FROM taggables ORDER BY tag_id, taggable_type, taggable_id"
    );
    expect(mockSelect.mock.calls.flatMap(([sql]) => String(sql))).not.toContain("files");
    expect(mockSelect.mock.calls.flatMap(([sql]) => String(sql))).not.toContain("sync_state");
    expect(mockWriteTextFile).toHaveBeenCalledWith(
      expect.stringMatching(/^luluKing\/backups\/luluKing-backup-\d{8}T\d{6}\d{3}Z\.json$/),
      expect.stringContaining('"attachmentPolicy": "excluded"'),
      { baseDir: BaseDirectory.AppData, createNew: true }
    );
    expect(preview.recordCounts.tasks).toBe(0);
    expect(preview.attachmentPolicy).toBe("excluded");
  });

  it("目录不存在时先创建备份目录", async () => {
    mockExists.mockResolvedValue(false);

    await createBackup();

    expect(mockMkdir).toHaveBeenCalledWith(BACKUPS_DIR, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  });
});

describe("parseBackup", () => {
  it("接受完整的当前格式", () => {
    expect(parseBackup(backupJson).data.tags).toEqual([]);
  });

  it.each([
    ["{坏 JSON"],
    [JSON.stringify({ format: "other" })],
    [createInvalidBackup((backup) => { backup.formatVersion = 2; })],
    [createInvalidBackup((backup) => {
      (backup.data as Record<string, unknown>).plans = null;
    })],
    [createInvalidBackup((backup) => {
      ((backup.data as Record<string, unknown>).tasks as Array<Record<string, unknown>>).push({
        id: 1,
        title: "缺少字段",
      });
    })],
  ])("拒绝无效或不兼容备份", (raw) => {
    expect(() => parseBackup(raw)).toThrow();
  });

  it("拒绝孤儿外键引用", () => {
    const raw = createInvalidBackup((backup) => {
      ((backup.data as Record<string, unknown>).tasks as Array<Record<string, unknown>>).push({
        id: 1,
        title: "任务",
        status: "todo",
        plan_date: null,
        due_date: null,
        is_key: 0,
        project_id: 100,
        notes: null,
        created_at: "2026-08-13 08:00:00",
        updated_at: "2026-08-13 08:00:00",
        deleted_at: null,
        synced_at: null,
      });
    });

    expect(() => parseBackup(raw)).toThrow(/project_id/);
  });

  it("拒绝错误类型的数值字段", () => {
    const raw = createInvalidBackup((backup) => {
      ((backup.data as Record<string, unknown>).tasks as Array<Record<string, unknown>>).push({
        id: 1,
        title: "任务",
        status: "todo",
        plan_date: null,
        due_date: null,
        is_key: "是",
        project_id: null,
        notes: null,
        created_at: "2026-08-13 08:00:00",
        updated_at: "2026-08-13 08:00:00",
        deleted_at: null,
        synced_at: null,
      });
    });

    expect(() => parseBackup(raw)).toThrow(/is_key/);
  });

  it("生成只读预览", () => {
    const preview = previewBackup("manual-backup.json", backupJson);
    expect(preview.filename).toBe("manual-backup.json");
    expect(preview.recordCounts.notes).toBe(0);
  });
});

describe("getLatestBackup", () => {
  it("读取最新且格式正确的备份", async () => {
    mockReadDir.mockResolvedValue([
      { name: "luluKing-backup-20260813T080000000Z.json", isFile: true, isDirectory: false, isSymlink: false },
      { name: "luluKing-backup-20260813T090000000Z.json", isFile: true, isDirectory: false, isSymlink: false },
      { name: "ignore.txt", isFile: true, isDirectory: false, isSymlink: false },
    ]);
    mockReadTextFile.mockResolvedValue(backupJson);

    const result = await getLatestBackup();

    expect(mockReadTextFile).toHaveBeenCalledWith(
      `${BACKUPS_DIR}/luluKing-backup-20260813T090000000Z.json`,
      { baseDir: BaseDirectory.AppData }
    );
    expect(result?.filename).toBe("luluKing-backup-20260813T090000000Z.json");
  });

  it("没有备份目录时返回空", async () => {
    mockExists.mockResolvedValue(false);

    await expect(getLatestBackup()).resolves.toBeNull();
    expect(mockReadDir).not.toHaveBeenCalled();
  });
});

describe("restoreBackup", () => {
  it("先创建自动安全备份，再调用 Rust 恢复命令", async () => {
    mockInvoke.mockResolvedValue({
      restoredRecordCounts: {
        tasks: 0,
        checklist_items: 0,
        events: 0,
        goals: 0,
        projects: 0,
        materials: 0,
        habits: 0,
        habit_logs: 0,
        subjects: 0,
        notes: 0,
        note_links: 0,
        tags: 0,
        taggables: 0,
        reviews: 0,
        plans: 0,
      },
    });

    const result = await restoreBackup(backupJson);

    expect(mockWriteTextFile).toHaveBeenCalled();
    expect(mockInvoke).toHaveBeenCalledWith("restore_backup", { backupJson });
    expect(result.automaticBackup.attachmentPolicy).toBe("excluded");
  });
});
