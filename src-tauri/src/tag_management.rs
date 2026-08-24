use sqlx::{Connection, Row, SqliteConnection};
use tauri::{AppHandle, Manager, Runtime};

#[tauri::command]
pub async fn merge_tags<R: Runtime>(
    app: AppHandle<R>,
    source_tag_id: i64,
    target_tag_id: i64,
) -> Result<(), String> {
    let app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法定位应用数据库目录：{error}"))?;
    let database_url = format!("sqlite:{}", app_config_dir.join("app.db").to_string_lossy());
    let mut connection = SqliteConnection::connect(&database_url)
        .await
        .map_err(|error| format!("无法连接数据库：{error}"))?;

    merge_tag_data(&mut connection, source_tag_id, target_tag_id).await
}

async fn merge_tag_data(
    connection: &mut SqliteConnection,
    source_tag_id: i64,
    target_tag_id: i64,
) -> Result<(), String> {
    if source_tag_id == target_tag_id {
        return Err("不能合并同一个标签".to_string());
    }

    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("无法开始标签合并事务：{error}"))?;

    let source_exists: Option<i64> = sqlx::query(
        "SELECT id FROM tags WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(source_tag_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("无法读取来源标签：{error}"))?
    .map(|row| row.get("id"));
    if source_exists.is_none() {
        return Err("来源标签不存在或已删除".to_string());
    }

    let target_exists: Option<i64> = sqlx::query(
        "SELECT id FROM tags WHERE id = ? AND status = 'active' AND deleted_at IS NULL",
    )
    .bind(target_tag_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("无法读取目标标签：{error}"))?
    .map(|row| row.get("id"));
    if target_exists.is_none() {
        return Err("目标标签不存在、已归档或已删除".to_string());
    }

    sqlx::query(
        "INSERT OR IGNORE INTO taggables (tag_id, taggable_type, taggable_id, created_at, synced_at)
         SELECT ?, taggable_type, taggable_id, created_at, synced_at
         FROM taggables WHERE tag_id = ?",
    )
    .bind(target_tag_id)
    .bind(source_tag_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("无法迁移标签关联：{error}"))?;

    sqlx::query("DELETE FROM taggables WHERE tag_id = ?")
        .bind(source_tag_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("无法清理旧标签关联：{error}"))?;

    sqlx::query(
        "UPDATE tags SET status = 'archived', updated_at = datetime('now') WHERE id = ?",
    )
    .bind(source_tag_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("无法归档来源标签：{error}"))?;

    transaction
        .commit()
        .await
        .map_err(|error| format!("提交标签合并事务失败：{error}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_connection() -> SqliteConnection {
        let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        sqlx::raw_sql(include_str!("../migrations/001_initial.sql"))
            .execute(&mut connection)
            .await
            .unwrap();
        connection
    }

    #[test]
    fn merges_relations_without_duplicates_and_archives_source() {
        tauri::async_runtime::block_on(async {
            let mut connection = memory_connection().await;
            sqlx::query("INSERT INTO tags (id, name, status) VALUES (1, '性能', 'active'), (2, '效能', 'active')")
                .execute(&mut connection)
                .await
                .unwrap();
            sqlx::query("INSERT INTO tasks (id, title, status, is_key, created_at, updated_at) VALUES (1, '优化查询', 'todo', 0, datetime('now'), datetime('now'))")
                .execute(&mut connection)
                .await
                .unwrap();
            sqlx::query("INSERT INTO taggables (tag_id, taggable_type, taggable_id) VALUES (1, 'task', 1), (2, 'task', 1)")
                .execute(&mut connection)
                .await
                .unwrap();

            merge_tag_data(&mut connection, 1, 2).await.unwrap();

            let target_relation_count: i64 = sqlx::query(
                "SELECT COUNT(*) AS count FROM taggables WHERE tag_id = 2 AND taggable_type = 'task' AND taggable_id = 1",
            )
            .fetch_one(&mut connection)
            .await
            .unwrap()
            .get("count");
            let source_relation_count: i64 = sqlx::query(
                "SELECT COUNT(*) AS count FROM taggables WHERE tag_id = 1",
            )
            .fetch_one(&mut connection)
            .await
            .unwrap()
            .get("count");
            let source_status: String = sqlx::query("SELECT status FROM tags WHERE id = 1")
                .fetch_one(&mut connection)
                .await
                .unwrap()
                .get("status");

            assert_eq!(target_relation_count, 1);
            assert_eq!(source_relation_count, 0);
            assert_eq!(source_status, "archived");
        });
    }

    #[test]
    fn refuses_to_merge_a_tag_into_itself() {
        tauri::async_runtime::block_on(async {
            let mut connection = memory_connection().await;
            assert!(merge_tag_data(&mut connection, 1, 1).await.is_err());
        });
    }
}
