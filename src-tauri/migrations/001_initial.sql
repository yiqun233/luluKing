-- ============================================================
-- 001_initial.sql  P0 初始建表
-- 个人工作台 全部数据模型
-- ============================================================

-- ========== 执行层 ==========

-- 任务
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'todo',  -- todo/done/abandoned
  plan_date   TEXT,                          -- 计划日期（我打算哪天做）
  due_date    TEXT,                          -- 截止日期（最晚何时做完）
  is_key      INTEGER NOT NULL DEFAULT 0,    -- 重点标记（二元）
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT,
  synced_at   TEXT
);

-- 清单项（挂在任务下，纯勾选）
CREATE TABLE IF NOT EXISTS checklist_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT,
  synced_at   TEXT
);

-- 日程事件
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,                 -- task_block / independent
  date        TEXT NOT NULL,
  start_time  TEXT,
  end_time    TEXT,
  task_id     INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT,
  synced_at   TEXT
);

-- ========== 组织 / 方向层 ==========

-- 目标（先于项目创建，因 projects 引用 goals）
CREATE TABLE IF NOT EXISTS goals (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  period_type      TEXT NOT NULL,            -- quarter / year / long
  period_value     TEXT,
  progress_type    TEXT NOT NULL,            -- count / aggregate
  progress_target  INTEGER,
  progress_current INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active',
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT,
  synced_at        TEXT
);

-- 项目
CREATE TABLE IF NOT EXISTS projects (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'delivery',  -- delivery / study
  status            TEXT NOT NULL DEFAULT 'inactive',  -- inactive/active/done/archived/abandoned
  is_focus          INTEGER NOT NULL DEFAULT 0,
  progress_override INTEGER,
  goal_id           INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT,
  synced_at         TEXT
);

-- 项目素材（学习研究型）
CREATE TABLE IF NOT EXISTS materials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                -- book / article / video / doc
  title       TEXT NOT NULL,
  author      TEXT,
  pages       INTEGER,
  progress    INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT,
  synced_at   TEXT
);

-- ========== 例行层 ==========

-- 习惯
CREATE TABLE IF NOT EXISTS habits (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  frequency_type   TEXT NOT NULL,            -- daily / weekly
  frequency_target INTEGER NOT NULL DEFAULT 1,
  goal_id          INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  pause_until      TEXT,
  best_streak      INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT,
  synced_at        TEXT
);

-- 习惯打卡记录
CREATE TABLE IF NOT EXISTS habit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id    INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at   TEXT,
  UNIQUE(habit_id, date)
);

-- ========== 沉淀层 ==========

-- 主题（知识库粗骨架）
CREATE TABLE IF NOT EXISTS subjects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT,
  synced_at   TEXT
);

-- 笔记 / 知识条目（收件箱 + 知识库同表）
CREATE TABLE IF NOT EXISTS notes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT,
  content             TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'inbox',  -- inbox / knowledge
  subject_id          INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  source              TEXT NOT NULL DEFAULT 'inbox',  -- inbox/new/review/study
  related_goal_id     INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  related_project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at          TEXT,
  synced_at           TEXT
);

-- 双向链接
CREATE TABLE IF NOT EXISTS note_links (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source_note_id  INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id  INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  target_type     TEXT,    -- note / goal / project / task
  target_id       INTEGER,
  link_text       TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at       TEXT
);

-- ========== 横切层 ==========

-- 标签
CREATE TABLE IF NOT EXISTS tags (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT,
  synced_at   TEXT
);

-- 标签多态关联
CREATE TABLE IF NOT EXISTS taggables (
  tag_id        INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  taggable_type TEXT NOT NULL,
  taggable_id   INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at     TEXT,
  PRIMARY KEY (tag_id, taggable_type, taggable_id)
);

-- 复盘
CREATE TABLE IF NOT EXISTS reviews (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT NOT NULL,              -- week / month
  period_start  TEXT NOT NULL,
  period_end    TEXT NOT NULL,
  auto_summary  TEXT,
  content       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at    TEXT,
  synced_at     TEXT
);

-- 周期计划
CREATE TABLE IF NOT EXISTS plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT NOT NULL,              -- week / month
  period_start  TEXT NOT NULL,
  period_end    TEXT NOT NULL,
  content       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at    TEXT,
  synced_at     TEXT
);

-- ========== 文件存储 ==========

CREATE TABLE IF NOT EXISTS files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT NOT NULL,
  original_name TEXT,
  mime_type     TEXT,
  size          INTEGER,
  path          TEXT NOT NULL,
  note_id       INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at     TEXT
);

-- ========== 同步元数据（P5 预留） ==========

CREATE TABLE IF NOT EXISTS sync_state (
  id              INTEGER PRIMARY KEY,
  device_id       TEXT NOT NULL,
  last_sync_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========== 全文搜索（FTS5） ==========

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  content,
  content=notes,
  content_rowid=id,
  tokenize='unicode61'
);

-- 笔记变更时同步 FTS 索引
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

-- ========== 索引 ==========

CREATE INDEX IF NOT EXISTS idx_tasks_plan_date ON tasks(plan_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_note_id);
CREATE INDEX IF NOT EXISTS idx_taggables_lookup ON taggables(taggable_type, taggable_id);
CREATE INDEX IF NOT EXISTS idx_projects_focus ON projects(is_focus) WHERE deleted_at IS NULL;
