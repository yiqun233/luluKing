import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

/**
 * 获取数据库连接（单例）
 * 数据库文件: app.db，存在应用数据目录下
 * 迁移由 tauri-plugin-sql 在 Rust 端自动执行
 */
export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:app.db");
  }
  return db;
}

/**
 * 执行 SQL（INSERT/UPDATE/DELETE），返回影响行数和 lastInsertId
 */
export async function execute(
  sql: string,
  bindValues?: unknown[]
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  const database = await getDb();
  const result = await database.execute(sql, bindValues);
  return {
    rowsAffected: result.rowsAffected,
    lastInsertId: result.lastInsertId ?? 0,
  };
}

/**
 * 查询 SQL（SELECT），返回类型化结果
 */
export async function select<T>(
  sql: string,
  bindValues?: unknown[]
): Promise<T[]> {
  const database = await getDb();
  return database.select<T[]>(sql, bindValues);
}

/**
 * 查询单条记录
 */
export async function selectOne<T>(
  sql: string,
  bindValues?: unknown[]
): Promise<T | null> {
  const rows = await select<T>(sql, bindValues);
  return rows.length > 0 ? rows[0] : null;
}
