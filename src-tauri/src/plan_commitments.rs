use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};
use tauri::{AppHandle, Manager, Runtime};

const RESOLUTIONS: &[&str] = &["completed", "rolled_over", "backlog", "abandoned"];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveWeekPlanInput {
    pub id: Option<i64>,
    pub period_start: String,
    pub period_end: String,
    pub content: Option<String>,
    pub task_ids: Vec<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvePlanTaskInput {
    pub plan_id: i64,
    pub task_id: i64,
    pub resolution: String,
    pub next_period_start: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedPlan {
    pub id: i64,
}

fn parse_date(value: &str, label: &str) -> Result<time::Date, String> {
    let parts: Vec<_> = value.split('-').collect();
    if parts.len() != 3
        || parts[0].len() != 4
        || parts[1].len() != 2
        || parts[2].len() != 2
        || parts.iter().any(|part| !part.bytes().all(|byte| byte.is_ascii_digit()))
    {
        return Err(format!("{label} 必须是 YYYY-MM-DD 日期"));
    }
    let year = parts[0]
        .parse::<i32>()
        .map_err(|_| format!("{label} 必须是 YYYY-MM-DD 日期"))?;
    let month = parts[1]
        .parse::<u8>()
        .map_err(|_| format!("{label} 必须是 YYYY-MM-DD 日期"))?;
    let day = parts[2]
        .parse::<u8>()
        .map_err(|_| format!("{label} 必须是 YYYY-MM-DD 日期"))?;
    let month = time::Month::try_from(month).map_err(|_| format!("{label} 必须是有效日期"))?;
    time::Date::from_calendar_date(year, month, day)
        .map_err(|_| format!("{label} 必须是有效日期"))
}

fn validate_date(value: &str, label: &str) -> Result<(), String> {
    parse_date(value, label).map(|_| ())
}

async fn open_connection<R: Runtime>(app: AppHandle<R>) -> Result<SqliteConnection, String> {
    let app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("无法定位应用数据库目录：{error}"))?;
    let database_url = format!("sqlite:{}", app_config_dir.join("app.db").to_string_lossy());
    SqliteConnection::connect(&database_url)
        .await
        .map_err(|error| format!("无法连接数据库：{error}"))
}

#[tauri::command]
pub async fn save_week_plan<R: Runtime>(
    app: AppHandle<R>,
    input: SaveWeekPlanInput,
) -> Result<SavedPlan, String> {
    let mut connection = open_connection(app).await?;
    save_week_plan_data(&mut connection, input).await
}

async fn save_week_plan_data(
    connection: &mut SqliteConnection,
    input: SaveWeekPlanInput,
) -> Result<SavedPlan, String> {
    validate_date(&input.period_start, "计划开始日期")?;
    validate_date(&input.period_end, "计划结束日期")?;
    if input.period_start > input.period_end {
        return Err("计划开始日期不能晚于结束日期".to_string());
    }

    let task_ids: HashSet<i64> = input.task_ids.iter().copied().collect();
    if task_ids.len() != input.task_ids.len() || task_ids.iter().any(|id| *id <= 0) {
        return Err("承诺任务列表不合法".to_string());
    }

    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("无法开始周计划保存事务：{error}"))?;

    let plan_id = if let Some(id) = input.id {
        let result = sqlx::query(
            "UPDATE plans
             SET period_start = ?, period_end = ?, content = ?, updated_at = datetime('now')
             WHERE id = ? AND type = 'week' AND deleted_at IS NULL",
        )
        .bind(&input.period_start)
        .bind(&input.period_end)
        .bind(&input.content)
        .bind(id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("无法更新周计划：{error}"))?;
        if result.rows_affected() == 0 {
            return Err("周计划不存在、已删除或类型不匹配".to_string());
        }
        id
    } else {
        sqlx::query(
            "INSERT INTO plans (type, period_start, period_end, content)
             VALUES ('week', ?, ?, ?)",
        )
        .bind(&input.period_start)
        .bind(&input.period_end)
        .bind(&input.content)
        .execute(&mut *transaction)
        .await
        .map_err(|error| format!("无法创建周计划：{error}"))?
        .last_insert_rowid()
    };

    for task_id in &input.task_ids {
        let valid_task: Option<i64> = sqlx::query(
            "SELECT t.id
             FROM tasks t
             WHERE t.id = ?
               AND t.status = 'todo'
               AND t.deleted_at IS NULL
               AND (
                 t.plan_date IS NULL
                 OR EXISTS (
                   SELECT 1 FROM plan_tasks current
                   WHERE current.plan_id = ? AND current.task_id = t.id AND current.resolution IS NULL
                 )
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM plan_tasks other_commitment
                 JOIN plans other_plan ON other_plan.id = other_commitment.plan_id
                 WHERE other_commitment.task_id = t.id
                   AND other_commitment.resolution IS NULL
                   AND other_plan.deleted_at IS NULL
                   AND other_commitment.plan_id != ?
               )",
        )
        .bind(task_id)
        .bind(plan_id)
        .bind(plan_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| format!("无法校验承诺任务：{error}"))?
        .map(|row| row.get("id"));
        if valid_task.is_none() {
            return Err("承诺任务必须是尚未安排且未被其他周计划承诺的待办事项".to_string());
        }
    }

    if input.task_ids.is_empty() {
        sqlx::query("DELETE FROM plan_tasks WHERE plan_id = ? AND resolution IS NULL")
            .bind(plan_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法移除周计划承诺：{error}"))?;
    } else {
        let placeholders = std::iter::repeat_n("?", input.task_ids.len())
            .collect::<Vec<_>>()
            .join(", ");
        let delete_sql = format!(
            "DELETE FROM plan_tasks WHERE plan_id = ? AND resolution IS NULL AND task_id NOT IN ({placeholders})"
        );
        let mut delete_query = sqlx::query(&delete_sql).bind(plan_id);
        for task_id in &input.task_ids {
            delete_query = delete_query.bind(task_id);
        }
        delete_query
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法移除周计划承诺：{error}"))?;
    }

    for task_id in &input.task_ids {
        sqlx::query("INSERT OR IGNORE INTO plan_tasks (plan_id, task_id) VALUES (?, ?)")
            .bind(plan_id)
            .bind(task_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法保存周计划承诺：{error}"))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("提交周计划保存事务失败：{error}"))?;

    Ok(SavedPlan { id: plan_id })
}

#[tauri::command]
pub async fn resolve_plan_task<R: Runtime>(
    app: AppHandle<R>,
    input: ResolvePlanTaskInput,
) -> Result<(), String> {
    let mut connection = open_connection(app).await?;
    resolve_plan_task_data(&mut connection, input).await
}

async fn resolve_plan_task_data(
    connection: &mut SqliteConnection,
    input: ResolvePlanTaskInput,
) -> Result<(), String> {
    if input.plan_id <= 0 || input.task_id <= 0 || !RESOLUTIONS.contains(&input.resolution.as_str()) {
        return Err("复盘决策参数不合法".to_string());
    }
    if input.resolution == "rolled_over" {
        validate_date(
            input.next_period_start.as_deref().unwrap_or_default(),
            "下期开始日期",
        )?;
    }

    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("无法开始复盘决策事务：{error}"))?;

    let period_end: Option<String> = sqlx::query_scalar(
        "SELECT period_end FROM plans WHERE id = ? AND type = 'week' AND deleted_at IS NULL",
    )
    .bind(input.plan_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("无法读取周计划：{error}"))?;
    let period_end = period_end.ok_or_else(|| "周计划不存在、已删除或类型不匹配".to_string())?;

    if let Some(next_period_start) = input.next_period_start.as_deref() {
        if input.resolution == "rolled_over" {
            let expected_next_period_start = parse_date(&period_end, "当前计划结束日期")?
                .next_day()
                .ok_or_else(|| "当前计划结束日期无法计算下期".to_string())?
                .to_string();
            if next_period_start != expected_next_period_start {
                return Err(format!("下期开始日期必须为 {expected_next_period_start}"));
            }
        }
    }

    let pending_commitment: Option<i64> = sqlx::query(
        "SELECT pt.task_id
         FROM plan_tasks pt
         JOIN tasks t ON t.id = pt.task_id
         WHERE pt.plan_id = ? AND pt.task_id = ?
           AND pt.resolution IS NULL
           AND t.status = 'todo' AND t.deleted_at IS NULL",
    )
    .bind(input.plan_id)
    .bind(input.task_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| format!("无法读取待决承诺：{error}"))?
    .map(|row| row.get("task_id"));
    if pending_commitment.is_none() {
        return Err("该承诺已处理，或任务已不再可处理".to_string());
    }

    match input.resolution.as_str() {
        "completed" => {
            sqlx::query("UPDATE tasks SET status = 'done', updated_at = datetime('now') WHERE id = ?")
                .bind(input.task_id)
                .execute(&mut *transaction)
                .await
                .map_err(|error| format!("无法完成承诺任务：{error}"))?;
        }
        "rolled_over" => {
            let next_period_start = input.next_period_start.as_deref().unwrap();
            sqlx::query(
                "UPDATE tasks SET plan_date = ?, updated_at = datetime('now') WHERE id = ?",
            )
            .bind(next_period_start)
            .bind(input.task_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法安排到下期：{error}"))?;
            sqlx::query(
                "UPDATE plan_tasks
                 SET resolution = 'rolled_over', resolved_at = datetime('now')
                 WHERE plan_id = ? AND task_id = ?",
            )
            .bind(input.plan_id)
            .bind(input.task_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法记录下期决策：{error}"))?;

            let next_plan_id: Option<i64> = sqlx::query_scalar(
                "SELECT id FROM plans
                 WHERE type = 'week' AND period_start = ? AND deleted_at IS NULL
                 ORDER BY id ASC LIMIT 1",
            )
            .bind(next_period_start)
            .fetch_optional(&mut *transaction)
            .await
            .map_err(|error| format!("无法读取下期周计划：{error}"))?;
            if let Some(next_plan_id) = next_plan_id {
                sqlx::query("INSERT OR IGNORE INTO plan_tasks (plan_id, task_id) VALUES (?, ?)")
                    .bind(next_plan_id)
                    .bind(input.task_id)
                    .execute(&mut *transaction)
                    .await
                    .map_err(|error| format!("无法加入下期周计划：{error}"))?;
            }
        }
        "backlog" => {
            sqlx::query(
                "UPDATE tasks SET plan_date = NULL, updated_at = datetime('now') WHERE id = ?",
            )
            .bind(input.task_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法退回待办池：{error}"))?;
            sqlx::query(
                "UPDATE plan_tasks
                 SET resolution = 'backlog', resolved_at = datetime('now')
                 WHERE plan_id = ? AND task_id = ?",
            )
            .bind(input.plan_id)
            .bind(input.task_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法记录退回待办池决策：{error}"))?;
        }
        "abandoned" => {
            sqlx::query(
                "UPDATE tasks SET status = 'abandoned', updated_at = datetime('now') WHERE id = ?",
            )
            .bind(input.task_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法放弃承诺任务：{error}"))?;
            sqlx::query(
                "UPDATE plan_tasks
                 SET resolution = 'abandoned', resolved_at = datetime('now')
                 WHERE plan_id = ? AND task_id = ?",
            )
            .bind(input.plan_id)
            .bind(input.task_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("无法记录放弃决策：{error}"))?;
        }
        _ => unreachable!("决策值已在事务前校验"),
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("提交复盘决策事务失败：{error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_connection() -> SqliteConnection {
        let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        for migration in [
            include_str!("../migrations/001_initial.sql"),
            include_str!("../migrations/002_migration_baseline.sql"),
            include_str!("../migrations/003_search_indexes.sql"),
            include_str!("../migrations/004_search_fts.sql"),
            include_str!("../migrations/005_plan_commitments.sql"),
        ] {
            sqlx::raw_sql(migration).execute(&mut connection).await.unwrap();
        }
        connection
    }

    async fn add_task(connection: &mut SqliteConnection, id: i64, title: &str, plan_date: Option<&str>) {
        sqlx::query(
            "INSERT INTO tasks (id, title, status, plan_date, is_key, created_at, updated_at)
             VALUES (?, ?, 'todo', ?, 0, datetime('now'), datetime('now'))",
        )
        .bind(id)
        .bind(title)
        .bind(plan_date)
        .execute(connection)
        .await
        .unwrap();
    }

    #[test]
    fn saves_week_commitments_atomically_and_only_from_available_backlog() {
        tauri::async_runtime::block_on(async {
            let mut connection = memory_connection().await;
            add_task(&mut connection, 1, "待办一", None).await;
            add_task(&mut connection, 2, "已安排", Some("2026-08-17")).await;

            let saved = save_week_plan_data(
                &mut connection,
                SaveWeekPlanInput {
                    id: None,
                    period_start: "2026-08-17".to_string(),
                    period_end: "2026-08-23".to_string(),
                    content: Some("本周".to_string()),
                    task_ids: vec![1],
                },
            )
            .await
            .unwrap();
            let commitment_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM plan_tasks WHERE plan_id = ? AND task_id = 1",
            )
            .bind(saved.id)
            .fetch_one(&mut connection)
            .await
            .unwrap();
            assert_eq!(commitment_count, 1);

            let result = save_week_plan_data(
                &mut connection,
                SaveWeekPlanInput {
                    id: None,
                    period_start: "2026-08-24".to_string(),
                    period_end: "2026-08-30".to_string(),
                    content: None,
                    task_ids: vec![2],
                },
            )
            .await;
            let plan_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM plans")
                .fetch_one(&mut connection)
                .await
                .unwrap();
            assert!(result.is_err());
            assert_eq!(plan_count, 1);
        });
    }

    #[test]
    fn resolves_all_four_outcomes_and_carries_over_to_existing_next_week() {
        tauri::async_runtime::block_on(async {
            let mut connection = memory_connection().await;
            for id in 1..=4 {
                add_task(&mut connection, id, &format!("任务{id}"), Some("2026-08-17")).await;
            }
            sqlx::query(
                "INSERT INTO plans (id, type, period_start, period_end) VALUES
                 (1, 'week', '2026-08-17', '2026-08-23'),
                 (2, 'week', '2026-08-24', '2026-08-30')",
            )
            .execute(&mut connection)
            .await
            .unwrap();
            for task_id in 1..=4 {
                sqlx::query("INSERT INTO plan_tasks (plan_id, task_id) VALUES (1, ?)")
                    .bind(task_id)
                    .execute(&mut connection)
                    .await
                    .unwrap();
            }

            for (task_id, resolution, next_period_start) in [
                (1, "completed", None),
                (2, "rolled_over", Some("2026-08-24".to_string())),
                (3, "backlog", None),
                (4, "abandoned", None),
            ] {
                resolve_plan_task_data(
                    &mut connection,
                    ResolvePlanTaskInput {
                        plan_id: 1,
                        task_id,
                        resolution: resolution.to_string(),
                        next_period_start,
                    },
                )
                .await
                .unwrap();
            }

            let statuses: Vec<String> = sqlx::query_scalar(
                "SELECT status FROM tasks WHERE id IN (1, 4) ORDER BY id",
            )
            .fetch_all(&mut connection)
            .await
            .unwrap();
            let backlog_plan_date: Option<String> = sqlx::query_scalar(
                "SELECT plan_date FROM tasks WHERE id = 3",
            )
            .fetch_one(&mut connection)
            .await
            .unwrap();
            let rolled_over_date: Option<String> = sqlx::query_scalar(
                "SELECT plan_date FROM tasks WHERE id = 2",
            )
            .fetch_one(&mut connection)
            .await
            .unwrap();
            let next_plan_commitment: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM plan_tasks WHERE plan_id = 2 AND task_id = 2 AND resolution IS NULL",
            )
            .fetch_one(&mut connection)
            .await
            .unwrap();
            let resolutions: Vec<String> = sqlx::query_scalar(
                "SELECT resolution FROM plan_tasks WHERE plan_id = 1 ORDER BY task_id",
            )
            .fetch_all(&mut connection)
            .await
            .unwrap();

            assert_eq!(statuses, ["done", "abandoned"]);
            assert_eq!(backlog_plan_date, None);
            assert_eq!(rolled_over_date.as_deref(), Some("2026-08-24"));
            assert_eq!(next_plan_commitment, 1);
            assert_eq!(resolutions, ["completed", "rolled_over", "backlog", "abandoned"]);
        });
    }
}
