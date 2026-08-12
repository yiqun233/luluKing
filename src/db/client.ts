import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

/**
 * 获取数据库连接（单例）
 * 数据库文件: app.db，存在应用数据目录下
 * 迁移由 tauri-plugin-sql 在 Rust 端自动执行
 */
export async function getDb(): Promise<Database> {
  if (!db) {
    try {
      db = await Database.load("sqlite:app.db");
    } catch (e) {
      console.error("[DB] 加载数据库失败:", e);
      throw e;
    }
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
  try {
    const result = await database.execute(sql, bindValues);
    return {
      rowsAffected: result.rowsAffected,
      lastInsertId: result.lastInsertId ?? 0,
    };
  } catch (e) {
    console.error("[DB execute] 失败:", e, "\nSQL:", sql, "\n参数:", bindValues);
    throw e;
  }
}

/**
 * 查询 SQL（SELECT），返回类型化结果
 */
export async function select<T>(
  sql: string,
  bindValues?: unknown[]
): Promise<T[]> {
  const database = await getDb();
  try {
    return await database.select<T[]>(sql, bindValues);
  } catch (e) {
    console.error("[DB select] 失败:", e, "\nSQL:", sql, "\n参数:", bindValues);
    throw e;
  }
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
