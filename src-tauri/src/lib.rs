mod backup_restore;

use tauri_plugin_sql::{Migration, MigrationKind};

const DATABASE_VERSION: i64 = 2;

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
            version: DATABASE_VERSION,
            description: "establish migration baseline",
            sql: include_str!("../migrations/002_migration_baseline.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![backup_restore::restore_backup])
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
    use std::borrow::Cow;

    use super::DATABASE_VERSION;
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
                DATABASE_VERSION => SqlxMigration::new(
                    DATABASE_VERSION,
                    "establish migration baseline".into(),
                    MigrationType::ReversibleUp,
                    include_str!("../migrations/002_migration_baseline.sql").into(),
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
            let mut connection = SqliteConnection::connect("sqlite::memory:")
                .await
                .unwrap();

            migrator(&[1]).run_direct(&mut connection).await.unwrap();
            sqlx::query(
                "INSERT INTO tasks (title, status, is_key, created_at, updated_at) VALUES ('升级前任务', 'todo', 0, datetime('now'), datetime('now'))",
            )
            .execute(&mut connection)
            .await
            .unwrap();

            migrator(&[1, DATABASE_VERSION])
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

            assert_eq!(task_title, "升级前任务");
            assert_eq!(latest_version, DATABASE_VERSION);
        });
    }
}
