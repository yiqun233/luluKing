mod backup_restore;
mod note_links;
mod plan_commitments;
mod tag_management;

use tauri_plugin_sql::{Migration, MigrationKind};

const MIGRATION_BASELINE_VERSION: i64 = 2;
const SEARCH_INDEX_VERSION: i64 = 3;
const FULL_TEXT_SEARCH_VERSION: i64 = 4;
const DATABASE_VERSION: i64 = 5;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: MIGRATION_BASELINE_VERSION,
            description: "establish migration baseline",
            sql: include_str!("../migrations/002_migration_baseline.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: SEARCH_INDEX_VERSION,
            description: "add search fallback indexes",
            sql: include_str!("../migrations/003_search_indexes.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: FULL_TEXT_SEARCH_VERSION,
            description: "add full text search index",
            sql: include_str!("../migrations/004_search_fts.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: DATABASE_VERSION,
            description: "add weekly plan task commitments",
            sql: include_str!("../migrations/005_plan_commitments.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            backup_restore::restore_backup,
            note_links::save_knowledge_note,
            plan_commitments::resolve_plan_task,
            plan_commitments::save_week_plan,
            tag_management::merge_tags
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:app.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use std::{
        borrow::Cow,
        time::{Duration, Instant},
    };

    use super::{DATABASE_VERSION, FULL_TEXT_SEARCH_VERSION, MIGRATION_BASELINE_VERSION, SEARCH_INDEX_VERSION};
    use sqlx::{
        migrate::{Migration as SqlxMigration, MigrationType, Migrator},
        Connection, Row, SqliteConnection,
    };

    fn migrator(versions: &[i64]) -> Migrator {
        let migrations = versions
            .iter()
            .map(|version| match *version {
                1 => SqlxMigration::new(
                    1,
                    "create initial tables".into(),
                    MigrationType::ReversibleUp,
                    include_str!("../migrations/001_initial.sql").into(),
                    false,
                ),
                MIGRATION_BASELINE_VERSION => SqlxMigration::new(
                    MIGRATION_BASELINE_VERSION,
                    "establish migration baseline".into(),
                    MigrationType::ReversibleUp,
                    include_str!("../migrations/002_migration_baseline.sql").into(),
                    false,
                ),
                SEARCH_INDEX_VERSION => SqlxMigration::new(
                    SEARCH_INDEX_VERSION,
                    "add search fallback indexes".into(),
                    MigrationType::ReversibleUp,
                    include_str!("../migrations/003_search_indexes.sql").into(),
                    false,
                ),
                FULL_TEXT_SEARCH_VERSION => SqlxMigration::new(
                    FULL_TEXT_SEARCH_VERSION,
                    "add full text search index".into(),
                    MigrationType::ReversibleUp,
                    include_str!("../migrations/004_search_fts.sql").into(),
                    false,
                ),
                DATABASE_VERSION => SqlxMigration::new(
                    DATABASE_VERSION,
                    "add weekly plan task commitments".into(),
                    MigrationType::ReversibleUp,
                    include_str!("../migrations/005_plan_commitments.sql").into(),
                    false,
                ),
                _ => unreachable!("测试中不应出现未登记的迁移版本"),
            })
            .collect();

        Migrator {
            migrations: Cow::Owned(migrations),
            ignore_missing: false,
            locking: true,
            no_tx: false,
        }
    }

    #[test]
    fn upgrades_a_version_one_database_without_losing_data() {
        tauri::async_runtime::block_on(async {
            let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();

            migrator(&[1]).run_direct(&mut connection).await.unwrap();
            sqlx::query(
                "INSERT INTO tasks (title, status, is_key, created_at, updated_at) VALUES ('升级前任务', 'todo', 0, datetime('now'), datetime('now'))",
            )
            .execute(&mut connection)
            .await
            .unwrap();

            migrator(&[
                1,
                MIGRATION_BASELINE_VERSION,
                SEARCH_INDEX_VERSION,
                FULL_TEXT_SEARCH_VERSION,
                DATABASE_VERSION,
            ])
            .run_direct(&mut connection)
            .await
            .unwrap();

            let task_title: String = sqlx::query("SELECT title FROM tasks WHERE id = 1")
                .fetch_one(&mut connection)
                .await
                .unwrap()
                .get("title");
            let latest_version: i64 =
                sqlx::query("SELECT MAX(version) AS version FROM _sqlx_migrations")
                    .fetch_one(&mut connection)
                    .await
                    .unwrap()
                    .get("version");
            let indexed_before_update: i64 = sqlx::query(
                "SELECT COUNT(*) AS count FROM search_fts WHERE entity_type = 'task' AND search_fts MATCH ?",
            )
            .bind("\"升级前任务\"")
            .fetch_one(&mut connection)
            .await
            .unwrap()
            .get("count");

            sqlx::query("UPDATE tasks SET title = '升级后任务' WHERE id = 1")
                .execute(&mut connection)
                .await
                .unwrap();
            let indexed_after_update: i64 = sqlx::query(
                "SELECT COUNT(*) AS count FROM search_fts WHERE entity_type = 'task' AND search_fts MATCH ?",
            )
            .bind("\"升级后任务\"")
            .fetch_one(&mut connection)
            .await
            .unwrap()
            .get("count");

            sqlx::query("UPDATE tasks SET deleted_at = datetime('now') WHERE id = 1")
                .execute(&mut connection)
                .await
                .unwrap();
            let indexed_after_delete: i64 = sqlx::query(
                "SELECT COUNT(*) AS count FROM search_fts WHERE entity_type = 'task' AND search_fts MATCH ?",
            )
            .bind("\"升级后任务\"")
            .fetch_one(&mut connection)
            .await
            .unwrap()
            .get("count");

            assert_eq!(task_title, "升级前任务");
            assert_eq!(latest_version, DATABASE_VERSION);
            assert_eq!(indexed_before_update, 1);
            assert_eq!(indexed_after_update, 1);
            assert_eq!(indexed_after_delete, 0);
        });
    }

    #[test]
    fn sqlite_runtime_supports_fts5() {
        tauri::async_runtime::block_on(async {
            let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
            let result = sqlx::query("CREATE VIRTUAL TABLE search_fts USING fts5(content)")
                .execute(&mut connection)
                .await;

            assert!(result.is_ok());
        });
    }

    #[test]
    fn fts5_searches_two_thousand_tasks_within_two_seconds() {
        tauri::async_runtime::block_on(async {
            let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
            migrator(&[
                1,
                MIGRATION_BASELINE_VERSION,
                SEARCH_INDEX_VERSION,
                FULL_TEXT_SEARCH_VERSION,
                DATABASE_VERSION,
            ])
            .run_direct(&mut connection)
            .await
            .unwrap();

            let mut transaction = connection.begin().await.unwrap();
            for index in 0..2_000 {
                sqlx::query(
                    "INSERT INTO tasks (title, status, is_key, created_at, updated_at) VALUES (?, 'todo', 0, datetime('now'), datetime('now'))",
                )
                .bind(format!("性能任务 {index}"))
                .execute(&mut *transaction)
                .await
                .unwrap();
            }
            transaction.commit().await.unwrap();

            let started_at = Instant::now();
            let count: i64 = sqlx::query(
                "SELECT COUNT(*) AS count FROM search_fts WHERE entity_type = 'task' AND search_fts MATCH ?",
            )
            .bind("性能*")
            .fetch_one(&mut connection)
            .await
            .unwrap()
            .get("count");

            assert_eq!(count, 2_000);
            assert!(started_at.elapsed() < Duration::from_secs(2));
        });
    }
}
