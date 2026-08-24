use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteLinkInput {
    pub target_note_id: i64,
    pub link_text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveKnowledgeNoteInput {
    pub id: Option<i64>,
    pub title: Option<String>,
    pub content: String,
    pub subject_id: Option<i64>,
    pub links: Vec<NoteLinkInput>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedNote {
    pub id: i64,
}

#[tauri::command]
pub async fn save_knowledge_note<R: Runtime>(
    app: AppHandle<R>,
    input: SaveKnowledgeNoteInput,
) -> Result<SavedNote, String> {
    let app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法定位应用数据库目录：{error}"))?;
    let database_url = format!("sqlite:{}", app_config_dir.join("app.db").to_string_lossy());
    let mut connection = SqliteConnection::connect(&database_url)
        .await
        .map_err(|error| format!("无法连接数据库：{error}"))?;

    save_note_data(&mut connection, input).await
}

async fn save_note_data(
    connection: &mut SqliteConnection,
    input: SaveKnowledgeNoteInput,
) -> Result<SavedNote, String> {
    if input.content.trim().is_empty() {
        return Err("笔记内容不能为空".to_string());
    }

    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("无法开始笔记保存事务：{error}"))?;

    let note_id = if let Some(id) = input.id {
        let result = sqlx::query(
            "UPDATE notes
             SET title = ?, content = ?, subject_id = ?, updated_at = datetime('now')
             WHERE id = ? AND status = 'knowledge' AND deleted_at IS NULL",
        )
        .bind(&input.title)
        .bind(&input.content)
        .bind(input.subject_id)
        .bind(id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("无法更新笔记：{error}"))?;
        if result.rows_affected() == 0 {
            return Err("笔记不存在、已删除或不属于知识库".to_string());
        }
        id
    } else {
        let result = sqlx::query(
            "INSERT INTO notes (title, content, status, subject_id, source)
             VALUES (?, ?, 'knowledge', ?, 'new')",
        )
        .bind(&input.title)
        .bind(&input.content)
        .bind(input.subject_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("无法创建笔记：{error}"))?;
        result.last_insert_rowid()
    };

    let mut links = HashSet::new();
    for link in input.links {
        if link.target_note_id == note_id {
            return Err("笔记不能链接到自身".to_string());
        }
        if link.link_text.trim().is_empty() {
            return Err("链接文本不能为空".to_string());
        }
        let target_exists: Option<i64> = sqlx::query(
            "SELECT id FROM notes
             WHERE id = ? AND status = 'knowledge' AND deleted_at IS NULL",
        )
        .bind(link.target_note_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| format!("无法校验链接目标：{error}"))?
        .map(|row| row.get("id"));
        if target_exists.is_none() {
            return Err("链接目标不存在、已删除或不属于知识库".to_string());
        }
        links.insert((link.target_note_id, link.link_text));
    }

    sqlx::query("DELETE FROM note_links WHERE source_note_id = ?")
        .bind(note_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("无法更新笔记链接：{error}"))?;

    for (target_note_id, link_text) in links {
        sqlx::query(
            "INSERT INTO note_links (source_note_id, target_note_id, target_type, target_id, link_text)
             VALUES (?, ?, 'note', ?, ?)",
        )
        .bind(note_id)
        .bind(target_note_id)
        .bind(target_note_id)
        .bind(link_text)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("无法写入笔记链接：{error}"))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("提交笔记保存事务失败：{error}"))?;

    Ok(SavedNote { id: note_id })
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
        sqlx::raw_sql(include_str!("../migrations/002_migration_baseline.sql"))
            .execute(&mut connection)
            .await
            .unwrap();
        sqlx::raw_sql(include_str!("../migrations/003_search_indexes.sql"))
            .execute(&mut connection)
            .await
            .unwrap();
        sqlx::raw_sql(include_str!("../migrations/004_search_fts.sql"))
            .execute(&mut connection)
            .await
            .unwrap();
        connection
    }

    #[test]
    fn saves_note_and_replaces_outgoing_links_atomically() {
        tauri::async_runtime::block_on(async {
            let mut connection = memory_connection().await;
            sqlx::query(
                "INSERT INTO notes (id, title, content, status, source) VALUES
                 (1, '目标笔记', '内容', 'knowledge', 'new'),
                 (2, '另一个目标', '内容', 'knowledge', 'new')",
            )
            .execute(&mut connection)
            .await
            .unwrap();

            let created = save_note_data(
                &mut connection,
                SaveKnowledgeNoteInput {
                    id: None,
                    title: Some("来源笔记".to_string()),
                    content: "参见 [[目标笔记]]".to_string(),
                    subject_id: None,
                    links: vec![NoteLinkInput {
                        target_note_id: 1,
                        link_text: "[[目标笔记]]".to_string(),
                    }],
                },
            )
            .await
            .unwrap();

            save_note_data(
                &mut connection,
                SaveKnowledgeNoteInput {
                    id: Some(created.id),
                    title: Some("来源笔记".to_string()),
                    content: "改为参见 [[另一个目标]]".to_string(),
                    subject_id: None,
                    links: vec![NoteLinkInput {
                        target_note_id: 2,
                        link_text: "[[另一个目标]]".to_string(),
                    }],
                },
            )
            .await
            .unwrap();

            let linked_target_id: i64 = sqlx::query(
                "SELECT target_note_id FROM note_links WHERE source_note_id = ?",
            )
            .bind(created.id)
            .fetch_one(&mut connection)
            .await
            .unwrap()
            .get("target_note_id");
            let indexed_count: i64 = sqlx::query(
                "SELECT COUNT(*) AS count FROM search_fts WHERE entity_type = 'note' AND entity_id = ? AND search_fts MATCH ?",
            )
            .bind(created.id)
            .bind("另一个目标*")
            .fetch_one(&mut connection)
            .await
            .unwrap()
            .get("count");
            assert_eq!(linked_target_id, 2);
            assert_eq!(indexed_count, 1);
        });
    }

    #[test]
    fn rejects_missing_or_self_referential_targets() {
        tauri::async_runtime::block_on(async {
            let mut connection = memory_connection().await;
            let missing_target = save_note_data(
                &mut connection,
                SaveKnowledgeNoteInput {
                    id: None,
                    title: Some("来源笔记".to_string()),
                    content: "内容".to_string(),
                    subject_id: None,
                    links: vec![NoteLinkInput {
                        target_note_id: 999,
                        link_text: "[[不存在]]".to_string(),
                    }],
                },
            )
            .await;
            assert!(missing_target.is_err());

            let created = save_note_data(
                &mut connection,
                SaveKnowledgeNoteInput {
                    id: None,
                    title: Some("来源笔记".to_string()),
                    content: "内容".to_string(),
                    subject_id: None,
                    links: vec![],
                },
            )
            .await
            .unwrap();
            let self_referential = save_note_data(
                &mut connection,
                SaveKnowledgeNoteInput {
                    id: Some(created.id),
                    title: Some("来源笔记".to_string()),
                    content: "内容".to_string(),
                    subject_id: None,
                    links: vec![NoteLinkInput {
                        target_note_id: created.id,
                        link_text: "[[来源笔记]]".to_string(),
                    }],
                },
            )
            .await;
            assert!(self_referential.is_err());
        });
    }
}
