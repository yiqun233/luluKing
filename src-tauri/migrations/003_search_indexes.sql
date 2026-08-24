-- R1.1：搜索筛选索引
-- 配合 FTS5 主索引优化状态、标题和标签关联筛选。

CREATE INDEX IF NOT EXISTS idx_tasks_search_status_title
  ON tasks(status, title) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_search_status_title
  ON notes(status, title) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_search_status_title
  ON projects(status, title) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goals_search_status_title
  ON goals(status, title) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_habits_search_status_title
  ON habits(status, title) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_search_date_title
  ON events(date, title) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_search_status_period
  ON reviews(status, period_start) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tags_search_name
  ON tags(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_taggables_search_tag
  ON taggables(tag_id, taggable_type, taggable_id);
