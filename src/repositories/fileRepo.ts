import { writeFile, readFile, remove, mkdir, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import { execute, select, selectOne } from "@/db/client";
import type { FileRecord } from "@/types/entities";

const FILES_DIR = "luluKing/files";

/**
 * 初始化文件存储目录
 */
export async function initFileStorage(): Promise<void> {
  if (!(await exists(FILES_DIR, { baseDir: BaseDirectory.AppData }))) {
    await mkdir(FILES_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

/**
 * 保存文件到磁盘 + 记录元信息到数据库
 * @param filename 原始文件名
 * @param data 文件内容
 * @param mimeType MIME 类型
 * @param noteId 关联笔记 ID（可选）
 * @returns 数据库记录
 */
export async function saveFile(
  filename: string,
  data: ArrayBuffer,
  mimeType?: string,
  noteId?: number
): Promise<FileRecord> {
  // 生成唯一存储文件名：时间戳-原始名
  const storedName = `${Date.now()}-${filename}`;
  const relativePath = `files/${storedName}`;

  // 写文件到磁盘
  await writeFile(relativePath, new Uint8Array(data), { baseDir: BaseDirectory.AppData });

  // 存元信息到数据库
  const { lastInsertId } = await execute(
    `INSERT INTO files (filename, original_name, mime_type, size, path, note_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [storedName, filename, mimeType || null, data.byteLength, relativePath, noteId || null]
  );

  const record = await selectOne<FileRecord>(
    `SELECT * FROM files WHERE id = ?`,
    [lastInsertId]
  );
  return record!;
}

/**
 * 读取文件内容
 */
export async function readFileRecord(id: number): Promise<{ data: ArrayBuffer; record: FileRecord } | null> {
  const record = await selectOne<FileRecord>(
    `SELECT * FROM files WHERE id = ?`,
    [id]
  );
  if (!record) return null;

  const data = await readFile(record.path, { baseDir: BaseDirectory.AppData });
  return { data, record };
}

/**
 * 删除文件（磁盘 + 数据库）
 */
export async function deleteFile(id: number): Promise<void> {
  const record = await selectOne<FileRecord>(
    `SELECT * FROM files WHERE id = ?`,
    [id]
  );
  if (!record) return;

  // 删磁盘文件
  try {
    await remove(record.path, { baseDir: BaseDirectory.AppData });
  } catch {
    // 文件可能已不存在，忽略
  }

  // 删数据库记录
  await execute(`DELETE FROM files WHERE id = ?`, [id]);
}

/**
 * 获取笔记关联的文件列表
 */
export async function getFilesByNote(noteId: number): Promise<FileRecord[]> {
  return select<FileRecord>(
    `SELECT * FROM files WHERE note_id = ? ORDER BY created_at`,
    [noteId]
  );
}
