use std::collections::{BTreeMap, HashSet};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sqlx::{Connection, Row, Sqlite, SqliteConnection, Transaction};
use tauri::{AppHandle, Manager, Runtime};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

const BACKUP_FORMAT: &str = "luluKing-backup";
const BACKUP_FORMAT_VERSION: u64 = 1;
const DATABASE_VERSION: i64 = 2;

const TASKS_COLUMNS: &[&str] = &[
    "id",
    "title",
    "status",
    "plan_date",
    "due_date",
    "is_key",
    "project_id",
    "notes",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const CHECKLIST_ITEMS_COLUMNS: &[&str] = &[
    "id",
    "task_id",
    "title",
    "done",
    "sort_order",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const EVENTS_COLUMNS: &[&str] = &[
    "id",
    "title",
    "type",
    "date",
    "start_time",
    "end_time",
    "task_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const GOALS_COLUMNS: &[&str] = &[
    "id",
    "title",
    "period_type",
    "period_value",
    "progress_type",
    "progress_target",
    "progress_current",
    "status",
    "notes",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const PROJECTS_COLUMNS: &[&str] = &[
    "id",
    "title",
    "type",
    "status",
    "is_focus",
    "progress_override",
    "goal_id",
    "notes",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const MATERIALS_COLUMNS: &[&str] = &[
    "id",
    "project_id",
    "type",
    "title",
    "author",
    "pages",
    "progress",
    "notes",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const HABITS_COLUMNS: &[&str] = &[
    "id",
    "title",
    "frequency_type",
    "frequency_target",
    "goal_id",
    "status",
    "pause_until",
    "best_streak",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const HABIT_LOGS_COLUMNS: &[&str] = &["id", "habit_id", "date", "created_at", "synced_at"];
const SUBJECTS_COLUMNS: &[&str] = &[
    "id",
    "name",
    "sort_order",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const NOTES_COLUMNS: &[&str] = &[
    "id",
    "title",
    "content",
    "status",
    "subject_id",
    "source",
    "related_goal_id",
    "related_project_id",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const NOTE_LINKS_COLUMNS: &[&str] = &[
    "id",
    "source_note_id",
    "target_note_id",
    "target_type",
    "target_id",
    "link_text",
    "created_at",
    "synced_at",
];
const TAGS_COLUMNS: &[&str] = &[
    "id",
    "name",
    "color",
    "status",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const TAGGABLES_COLUMNS: &[&str] = &["tag_id", "taggable_type", "taggable_id", "created_at", "synced_at"];
const REVIEWS_COLUMNS: &[&str] = &[
    "id",
    "type",
    "period_start",
    "period_end",
    "auto_summary",
    "content",
    "status",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];
const PLANS_COLUMNS: &[&str] = &[
    "id",
    "type",
    "period_start",
    "period_end",
    "content",
    "created_at",
    "updated_at",
    "deleted_at",
    "synced_at",
];

type BackupRow = Map<String, Value>;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupDocument {
    format: String,
    format_version: u64,
    app_version: String,
    database_version: i64,
    exported_at: String,
    attachment_policy: String,
    data: BackupData,
}

#[derive(Deserialize)]
struct BackupData {
    tasks: Vec<BackupRow>,
    checklist_items: Vec<BackupRow>,
    events: Vec<BackupRow>,
    goals: Vec<BackupRow>,
    projects: Vec<BackupRow>,
    materials: Vec<BackupRow>,
    habits: Vec<BackupRow>,
    habit_logs: Vec<BackupRow>,
    subjects: Vec<BackupRow>,
    notes: Vec<BackupRow>,
    note_links: Vec<BackupRow>,
    tags: Vec<BackupRow>,
    taggables: Vec<BackupRow>,
    reviews: Vec<BackupRow>,
    plans: Vec<BackupRow>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    restored_record_counts: BTreeMap<String, usize>,
}

struct EntityIds {
    tasks: HashSet<i64>,
    goals: HashSet<i64>,
    projects: HashSet<i64>,
    habits: HashSet<i64>,
    subjects: HashSet<i64>,
    notes: HashSet<i64>,
    tags: HashSet<i64>,
    events: HashSet<i64>,
    reviews: HashSet<i64>,
}

fn invalid(message: impl Into<String>) -> String {
    format!("备份校验失败：{}", message.into())
}

fn row_value<'a>(row: &'a BackupRow, field: &str, label: &str) -> Result<&'a Value, String> {
    row.get(field)
        .ok_or_else(|| invalid(format!("{label} 缺少 {field}")))
}

fn require_string(row: &BackupRow, field: &str, label: &str) -> Result<String, String> {
    row_value(row, field, label)?
        .as_str()
        .map(ToOwned::to_owned)
        .ok_or_else(|| invalid(format!("{label} 的 {field} 必须是文本")))
}

fn require_optional_string(row: &BackupRow, field: &str, label: &str) -> Result<Option<String>, String> {
    match row_value(row, field, label)? {
        Value::Null => Ok(None),
        Value::String(value) => Ok(Some(value.clone())),
        _ => Err(invalid(format!("{label} 的 {field} 必须是文本或空值"))),
    }
}

fn require_id(row: &BackupRow, field: &str, label: &str) -> Result<i64, String> {
    row_value(row, field, label)?
        .as_i64()
        .filter(|value| *value > 0)
        .ok_or_else(|| invalid(format!("{label} 的 {field} 必须是正整数")))
}

fn require_optional_id(row: &BackupRow, field: &str, label: &str) -> Result<Option<i64>, String> {
    match row_value(row, field, label)? {
        Value::Null => Ok(None),
        Value::Number(value) => value
            .as_i64()
            .filter(|value| *value > 0)
            .map(Some)
            .ok_or_else(|| invalid(format!("{label} 的 {field} 必须是正整数或空值"))),
        _ => Err(invalid(format!("{label} 的 {field} 必须是正整数或空值"))),
    }
}

fn require_enum(row: &BackupRow, field: &str, allowed: &[&str], label: &str) -> Result<(), String> {
    let value = require_string(row, field, label)?;
    if allowed.contains(&value.as_str()) {
        Ok(())
    } else {
        Err(invalid(format!("{label} 的 {field} 不受支持")))
    }
}

fn require_date(row: &BackupRow, field: &str, label: &str) -> Result<(), String> {
    let Some(value) = require_optional_string(row, field, label)? else {
        return Ok(());
    };
    let valid = value.len() == 10
        && value.as_bytes().get(4) == Some(&b'-')
        && value.as_bytes().get(7) == Some(&b'-')
        && value
            .chars()
            .enumerate()
            .all(|(index, character)| index == 4 || index == 7 || character.is_ascii_digit());
    if valid {
        Ok(())
    } else {
        Err(invalid(format!("{label} 的 {field} 必须是 YYYY-MM-DD 日期")))
    }
}

fn validate_row_shape(rows: &[BackupRow], columns: &[&str], table: &str) -> Result<(), String> {
    for (index, row) in rows.iter().enumerate() {
        let label = format!("{table}[{index}]");
        for column in columns {
            let value = row_value(row, column, &label)?;
            if !value.is_null() && !value.is_string() && !value.is_number() {
                return Err(invalid(format!("{label} 的 {column} 格式不正确")));
            }
        }
    }
    Ok(())
}

fn collect_ids(rows: &[BackupRow], table: &str) -> Result<HashSet<i64>, String> {
    let mut ids = HashSet::new();
    for (index, row) in rows.iter().enumerate() {
        let id = require_id(row, "id", &format!("{table}[{index}]"))?;
        if !ids.insert(id) {
            return Err(invalid(format!("{table} 中存在重复 id：{id}")));
        }
    }
    Ok(ids)
}

fn require_reference(
    row: &BackupRow,
    field: &str,
    target_ids: &HashSet<i64>,
    label: &str,
    nullable: bool,
) -> Result<(), String> {
    let id = if nullable {
        require_optional_id(row, field, label)?
    } else {
        Some(require_id(row, field, label)?)
    };
    if let Some(id) = id {
        if !target_ids.contains(&id) {
            return Err(invalid(format!("{label} 引用了不存在的 {field}：{id}")));
        }
    }
    Ok(())
}

fn validate_document(document: &BackupDocument) -> Result<EntityIds, String> {
    if document.format != BACKUP_FORMAT {
        return Err(invalid("不是 luluKing 备份文件"));
    }
    if document.format_version != BACKUP_FORMAT_VERSION {
        return Err(invalid("该备份格式版本暂不受支持"));
    }
    if document.app_version.trim().is_empty() {
        return Err(invalid("缺少应用版本"));
    }
    if document.database_version < 1 || document.database_version > DATABASE_VERSION {
        return Err(invalid("数据库版本不受支持"));
    }
    OffsetDateTime::parse(&document.exported_at, &Rfc3339)
        .map_err(|_| invalid("导出时间格式不正确"))?;
    if document.attachment_policy != "excluded" {
        return Err(invalid("附件策略不受支持"));
    }

    let data = &document.data;
    validate_row_shape(&data.tasks, TASKS_COLUMNS, "tasks")?;
    validate_row_shape(&data.checklist_items, CHECKLIST_ITEMS_COLUMNS, "checklist_items")?;
    validate_row_shape(&data.events, EVENTS_COLUMNS, "events")?;
    validate_row_shape(&data.goals, GOALS_COLUMNS, "goals")?;
    validate_row_shape(&data.projects, PROJECTS_COLUMNS, "projects")?;
    validate_row_shape(&data.materials, MATERIALS_COLUMNS, "materials")?;
    validate_row_shape(&data.habits, HABITS_COLUMNS, "habits")?;
    validate_row_shape(&data.habit_logs, HABIT_LOGS_COLUMNS, "habit_logs")?;
    validate_row_shape(&data.subjects, SUBJECTS_COLUMNS, "subjects")?;
    validate_row_shape(&data.notes, NOTES_COLUMNS, "notes")?;
    validate_row_shape(&data.note_links, NOTE_LINKS_COLUMNS, "note_links")?;
    validate_row_shape(&data.tags, TAGS_COLUMNS, "tags")?;
    validate_row_shape(&data.taggables, TAGGABLES_COLUMNS, "taggables")?;
    validate_row_shape(&data.reviews, REVIEWS_COLUMNS, "reviews")?;
    validate_row_shape(&data.plans, PLANS_COLUMNS, "plans")?;

    let ids = EntityIds {
        tasks: collect_ids(&data.tasks, "tasks")?,
        goals: collect_ids(&data.goals, "goals")?,
        projects: collect_ids(&data.projects, "projects")?,
        habits: collect_ids(&data.habits, "habits")?,
        subjects: collect_ids(&data.subjects, "subjects")?,
        notes: collect_ids(&data.notes, "notes")?,
        tags: collect_ids(&data.tags, "tags")?,
        events: collect_ids(&data.events, "events")?,
        reviews: collect_ids(&data.reviews, "reviews")?,
    };
    collect_ids(&data.checklist_items, "checklist_items")?;
    collect_ids(&data.materials, "materials")?;
    collect_ids(&data.habit_logs, "habit_logs")?;
    collect_ids(&data.note_links, "note_links")?;
    collect_ids(&data.subjects, "subjects")?;
    collect_ids(&data.plans, "plans")?;

    for (index, row) in data.tasks.iter().enumerate() {
        let label = format!("tasks[{index}]");
        require_enum(row, "status", &["todo", "done", "abandoned"], &label)?;
        require_reference(row, "project_id", &ids.projects, &label, true)?;
        require_date(row, "plan_date", &label)?;
        require_date(row, "due_date", &label)?;
    }
    for (index, row) in data.checklist_items.iter().enumerate() {
        require_reference(row, "task_id", &ids.tasks, &format!("checklist_items[{index}]"), false)?;
    }
    for (index, row) in data.events.iter().enumerate() {
        let label = format!("events[{index}]");
        require_enum(row, "type", &["task_block", "independent"], &label)?;
        require_reference(row, "task_id", &ids.tasks, &label, true)?;
        require_date(row, "date", &label)?;
    }
    for (index, row) in data.goals.iter().enumerate() {
        let label = format!("goals[{index}]");
        require_enum(row, "period_type", &["quarter", "year", "long"], &label)?;
        require_enum(row, "progress_type", &["count", "aggregate"], &label)?;
        require_enum(row, "status", &["active", "done", "abandoned"], &label)?;
    }
    for (index, row) in data.projects.iter().enumerate() {
        let label = format!("projects[{index}]");
        require_enum(row, "type", &["delivery", "study"], &label)?;
        require_enum(
            row,
            "status",
            &["inactive", "active", "done", "archived", "abandoned"],
            &label,
        )?;
        require_reference(row, "goal_id", &ids.goals, &label, true)?;
    }
    for (index, row) in data.materials.iter().enumerate() {
        let label = format!("materials[{index}]");
        require_enum(row, "type", &["book", "article", "video", "doc"], &label)?;
        require_reference(row, "project_id", &ids.projects, &label, false)?;
    }
    for (index, row) in data.habits.iter().enumerate() {
        let label = format!("habits[{index}]");
        require_enum(row, "frequency_type", &["daily", "weekly"], &label)?;
        require_enum(row, "status", &["active", "paused", "archived"], &label)?;
        require_reference(row, "goal_id", &ids.goals, &label, true)?;
    }
    for (index, row) in data.habit_logs.iter().enumerate() {
        let label = format!("habit_logs[{index}]");
        require_reference(row, "habit_id", &ids.habits, &label, false)?;
        require_date(row, "date", &label)?;
    }
    for (index, row) in data.notes.iter().enumerate() {
        let label = format!("notes[{index}]");
        require_enum(row, "status", &["inbox", "knowledge"], &label)?;
        require_enum(row, "source", &["inbox", "new", "review", "study"], &label)?;
        require_reference(row, "subject_id", &ids.subjects, &label, true)?;
        require_reference(row, "related_goal_id", &ids.goals, &label, true)?;
        require_reference(row, "related_project_id", &ids.projects, &label, true)?;
    }
    for (index, row) in data.note_links.iter().enumerate() {
        let label = format!("note_links[{index}]");
        require_reference(row, "source_note_id", &ids.notes, &label, false)?;
        require_reference(row, "target_note_id", &ids.notes, &label, true)?;
        let target_type = require_optional_string(row, "target_type", &label)?;
        let target_id = require_optional_id(row, "target_id", &label)?;
        match (target_type, target_id) {
            (None, None) => {}
            (Some(target_type), Some(target_id)) => {
                let target_ids = match target_type.as_str() {
                    "note" => &ids.notes,
                    "goal" => &ids.goals,
                    "project" => &ids.projects,
                    "task" => &ids.tasks,
                    _ => return Err(invalid(format!("{label} 的 target_type 不受支持"))),
                };
                if !target_ids.contains(&target_id) {
                    return Err(invalid(format!("{label} 引用了不存在的 {target_type}：{target_id}")));
                }
            }
            _ => return Err(invalid(format!("{label} 的 target_type 与 target_id 必须同时存在或为空"))),
        }
    }
    for (index, row) in data.tags.iter().enumerate() {
        require_enum(row, "status", &["active", "archived"], &format!("tags[{index}]"))?;
    }
    let mut taggable_keys = HashSet::new();
    for (index, row) in data.taggables.iter().enumerate() {
        let label = format!("taggables[{index}]");
        let tag_id = require_id(row, "tag_id", &label)?;
        require_reference(row, "tag_id", &ids.tags, &label, false)?;
        let taggable_type = require_string(row, "taggable_type", &label)?;
        let taggable_id = require_id(row, "taggable_id", &label)?;
        let entity_ids = match taggable_type.as_str() {
            "task" => &ids.tasks,
            "project" => &ids.projects,
            "goal" => &ids.goals,
            "note" => &ids.notes,
            "habit" => &ids.habits,
            "event" => &ids.events,
            "review" => &ids.reviews,
            _ => return Err(invalid(format!("{label} 的 taggable_type 不受支持"))),
        };
        if !entity_ids.contains(&taggable_id) {
            return Err(invalid(format!("{label} 引用了不存在的标签实体")));
        }
        if !taggable_keys.insert((tag_id, taggable_type, taggable_id)) {
            return Err(invalid(format!("taggables 中存在重复关联")));
        }
    }
    for (index, row) in data.reviews.iter().enumerate() {
        let label = format!("reviews[{index}]");
        require_enum(row, "type", &["week", "month"], &label)?;
        require_enum(row, "status", &["draft", "done", "skipped"], &label)?;
        require_date(row, "period_start", &label)?;
        require_date(row, "period_end", &label)?;
    }
    for (index, row) in data.plans.iter().enumerate() {
        let label = format!("plans[{index}]");
        require_enum(row, "type", &["week", "month"], &label)?;
        require_date(row, "period_start", &label)?;
        require_date(row, "period_end", &label)?;
    }

    Ok(ids)
}

fn bind_value<'q>(
    query: sqlx::query::Query<'q, Sqlite, sqlx::sqlite::SqliteArguments<'q>>,
    value: &Value,
) -> Result<sqlx::query::Query<'q, Sqlite, sqlx::sqlite::SqliteArguments<'q>>, String> {
    match value {
        Value::Null => Ok(query.bind(Option::<String>::None)),
        Value::String(value) => Ok(query.bind(value.clone())),
        Value::Number(value) => {
            if let Some(value) = value.as_i64() {
                Ok(query.bind(value))
            } else if let Some(value) = value.as_f64() {
                Ok(query.bind(value))
            } else {
                Err(invalid("数值格式不受支持"))
            }
        }
        _ => Err(invalid("字段只能是文本、数值或空值")),
    }
}

async fn insert_rows(
    transaction: &mut Transaction<'_, Sqlite>,
    table: &str,
    columns: &[&str],
    rows: &[BackupRow],
) -> Result<(), String> {
    if rows.is_empty() {
        return Ok(());
    }
    let placeholders = std::iter::repeat_n("?", columns.len())
        .collect::<Vec<_>>()
        .join(", ");
    let query_sql = format!(
        "INSERT INTO {table} ({}) VALUES ({placeholders})",
        columns.join(", ")
    );
    for (index, row) in rows.iter().enumerate() {
        let label = format!("{table}[{index}]");
        let mut query = sqlx::query(&query_sql);
        for column in columns {
            query = bind_value(query, row_value(row, column, &label)?)?;
        }
        query
            .execute(&mut **transaction)
            .await
            .map_err(|error| format!("恢复写入 {table} 失败：{error}"))?;
    }
    Ok(())
}

async fn delete_current_data(transaction: &mut Transaction<'_, Sqlite>) -> Result<(), String> {
    for table in [
        "taggables",
        "note_links",
        "habit_logs",
        "checklist_items",
        "events",
        "materials",
        "tasks",
        "notes",
        "habits",
        "projects",
        "tags",
        "subjects",
        "goals",
        "reviews",
        "plans",
    ] {
        sqlx::query(&format!("DELETE FROM {table}"))
            .execute(&mut **transaction)
            .await
            .map_err(|error| format!("清理当前 {table} 数据失败：{error}"))?;
    }
    sqlx::query(
        "DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'checklist_items', 'events', 'goals', 'projects', 'materials', 'habits', 'habit_logs', 'subjects', 'notes', 'note_links', 'tags', 'reviews', 'plans')",
    )
    .execute(&mut **transaction)
    .await
    .map_err(|error| format!("重置数据序列失败：{error}"))?;
    Ok(())
}

fn record_counts(data: &BackupData) -> BTreeMap<String, usize> {
    BTreeMap::from([
        ("tasks".to_string(), data.tasks.len()),
        ("checklist_items".to_string(), data.checklist_items.len()),
        ("events".to_string(), data.events.len()),
        ("goals".to_string(), data.goals.len()),
        ("projects".to_string(), data.projects.len()),
        ("materials".to_string(), data.materials.len()),
        ("habits".to_string(), data.habits.len()),
        ("habit_logs".to_string(), data.habit_logs.len()),
        ("subjects".to_string(), data.subjects.len()),
        ("notes".to_string(), data.notes.len()),
        ("note_links".to_string(), data.note_links.len()),
        ("tags".to_string(), data.tags.len()),
        ("taggables".to_string(), data.taggables.len()),
        ("reviews".to_string(), data.reviews.len()),
        ("plans".to_string(), data.plans.len()),
    ])
}

#[tauri::command]
pub async fn restore_backup<R: Runtime>(
    app: AppHandle<R>,
    backup_json: String,
) -> Result<RestoreResult, String> {
    let document: BackupDocument = serde_json::from_str(&backup_json)
        .map_err(|_| invalid("备份文件不是有效的 JSON 格式"))?;
    validate_document(&document)?;

    let app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法定位应用数据库目录：{error}"))?;
    let database_url = format!("sqlite:{}", app_config_dir.join("app.db").to_string_lossy());
    let mut connection = SqliteConnection::connect(&database_url)
        .await
        .map_err(|error| format!("无法连接数据库：{error}"))?;
    let restored_record_counts = restore_data(&mut connection, &document).await?;

    Ok(RestoreResult {
        restored_record_counts,
    })
}

async fn restore_data(
    connection: &mut SqliteConnection,
    document: &BackupDocument,
) -> Result<BTreeMap<String, usize>, String> {
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&mut *connection)
        .await
        .map_err(|error| format!("无法启用数据完整性检查：{error}"))?;

    let file_count: i64 = sqlx::query("SELECT COUNT(*) AS count FROM files")
        .fetch_one(&mut *connection)
        .await
        .map_err(|error| format!("无法检查附件数据：{error}"))?
        .get("count");
    if file_count > 0 {
        return Err("当前存在附件记录，现有备份格式不包含附件，无法安全恢复。请先保留附件数据，等待附件备份功能上线。".to_string());
    }

    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("无法开始恢复事务：{error}"))?;
    delete_current_data(&mut transaction).await?;
    let data = &document.data;
    insert_rows(&mut transaction, "goals", GOALS_COLUMNS, &data.goals).await?;
    insert_rows(&mut transaction, "subjects", SUBJECTS_COLUMNS, &data.subjects).await?;
    insert_rows(&mut transaction, "tags", TAGS_COLUMNS, &data.tags).await?;
    insert_rows(&mut transaction, "projects", PROJECTS_COLUMNS, &data.projects).await?;
    insert_rows(&mut transaction, "habits", HABITS_COLUMNS, &data.habits).await?;
    insert_rows(&mut transaction, "notes", NOTES_COLUMNS, &data.notes).await?;
    insert_rows(&mut transaction, "reviews", REVIEWS_COLUMNS, &data.reviews).await?;
    insert_rows(&mut transaction, "plans", PLANS_COLUMNS, &data.plans).await?;
    insert_rows(&mut transaction, "tasks", TASKS_COLUMNS, &data.tasks).await?;
    insert_rows(&mut transaction, "materials", MATERIALS_COLUMNS, &data.materials).await?;
    insert_rows(
        &mut transaction,
        "checklist_items",
        CHECKLIST_ITEMS_COLUMNS,
        &data.checklist_items,
    )
    .await?;
    insert_rows(&mut transaction, "events", EVENTS_COLUMNS, &data.events).await?;
    insert_rows(&mut transaction, "habit_logs", HABIT_LOGS_COLUMNS, &data.habit_logs).await?;
    insert_rows(&mut transaction, "note_links", NOTE_LINKS_COLUMNS, &data.note_links).await?;
    insert_rows(&mut transaction, "taggables", TAGGABLES_COLUMNS, &data.taggables).await?;
    transaction
        .commit()
        .await
        .map_err(|error| format!("提交恢复事务失败：{error}"))?;

    Ok(record_counts(data))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_backup() -> String {
        r#"{
          "format":"luluKing-backup",
          "formatVersion":1,
          "appVersion":"0.1.0",
          "databaseVersion":2,
          "exportedAt":"2026-08-13T08:00:00.000Z",
          "attachmentPolicy":"excluded",
          "data":{
            "tasks":[],"checklist_items":[],"events":[],"goals":[],"projects":[],"materials":[],
            "habits":[],"habit_logs":[],"subjects":[],"notes":[],"note_links":[],"tags":[],
            "taggables":[],"reviews":[],"plans":[]
          }
        }"#
        .to_string()
    }

    #[test]
    fn accepts_current_empty_backup() {
        let document: BackupDocument = serde_json::from_str(&empty_backup()).unwrap();
        assert!(validate_document(&document).is_ok());
    }

    #[test]
    fn rejects_future_format_version() {
        let raw = empty_backup().replace("\"formatVersion\":1", "\"formatVersion\":2");
        let document: BackupDocument = serde_json::from_str(&raw).unwrap();
        assert!(validate_document(&document).is_err());
    }

    #[test]
    fn rejects_task_with_missing_project() {
        let raw = empty_backup().replace(
            "\"tasks\":[]",
            "\"tasks\":[{\"id\":1,\"title\":\"任务\",\"status\":\"todo\",\"plan_date\":null,\"due_date\":null,\"is_key\":0,\"project_id\":9,\"notes\":null,\"created_at\":\"2026-08-13 08:00:00\",\"updated_at\":\"2026-08-13 08:00:00\",\"deleted_at\":null,\"synced_at\":null}]",
        );
        let document: BackupDocument = serde_json::from_str(&raw).unwrap();
        assert!(validate_document(&document).is_err());
    }

    async fn memory_connection() -> SqliteConnection {
        let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        sqlx::raw_sql(include_str!("../migrations/001_initial.sql"))
            .execute(&mut connection)
            .await
            .unwrap();
        connection
    }

    #[test]
    fn restores_valid_backup_in_a_single_transaction() {
        tauri::async_runtime::block_on(async {
            let mut connection = memory_connection().await;
            sqlx::query(
                "INSERT INTO subjects (id, name, sort_order, created_at, updated_at) VALUES (1, '旧主题', 0, datetime('now'), datetime('now'))",
            )
            .execute(&mut connection)
            .await
            .unwrap();
            let document: BackupDocument = serde_json::from_str(&empty_backup()).unwrap();
            validate_document(&document).unwrap();

            let result = restore_data(&mut connection, &document).await.unwrap();
            let subject_count: i64 = sqlx::query("SELECT COUNT(*) AS count FROM subjects")
                .fetch_one(&mut connection)
                .await
                .unwrap()
                .get("count");

            assert_eq!(result.get("subjects"), Some(&0));
            assert_eq!(subject_count, 0);
        });
    }

    #[test]
    fn rolls_back_all_changes_when_a_restore_write_fails() {
        tauri::async_runtime::block_on(async {
            let mut connection = memory_connection().await;
            sqlx::query(
                "INSERT INTO subjects (id, name, sort_order, created_at, updated_at) VALUES (1, '保留主题', 0, datetime('now'), datetime('now'))",
            )
            .execute(&mut connection)
            .await
            .unwrap();
            let raw = empty_backup().replace(
                "\"tags\":[]",
                "\"tags\":[{\"id\":1,\"name\":\"重复\",\"color\":null,\"status\":\"active\",\"created_at\":\"2026-08-13 08:00:00\",\"updated_at\":\"2026-08-13 08:00:00\",\"deleted_at\":null,\"synced_at\":null},{\"id\":2,\"name\":\"重复\",\"color\":null,\"status\":\"active\",\"created_at\":\"2026-08-13 08:00:00\",\"updated_at\":\"2026-08-13 08:00:00\",\"deleted_at\":null,\"synced_at\":null}]",
            );
            let document: BackupDocument = serde_json::from_str(&raw).unwrap();

            assert!(restore_data(&mut connection, &document).await.is_err());
            let subject_name: String = sqlx::query("SELECT name FROM subjects WHERE id = 1")
                .fetch_one(&mut connection)
                .await
                .unwrap()
                .get("name");

            assert_eq!(subject_name, "保留主题");
        });
    }
}
