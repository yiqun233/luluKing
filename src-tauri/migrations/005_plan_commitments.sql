-- R1.4：周计划承诺与复盘决策
-- 一项任务在一个周期计划中只能承诺一次；resolution 为空表示仍待复盘决策。

CREATE TABLE IF NOT EXISTS plan_tasks (
  plan_id     INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  resolution  TEXT CHECK (resolution IN ('completed', 'rolled_over', 'backlog', 'abandoned')),
  resolved_at TEXT,
  PRIMARY KEY (plan_id, task_id),
  CHECK (
    (resolution IS NULL AND resolved_at IS NULL)
    OR (resolution IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_task_pending
  ON plan_tasks(task_id) WHERE resolution IS NULL;
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan
  ON plan_tasks(plan_id);

-- 从任务列表直接完成或重新打开任务时，承诺状态保持一致。
CREATE TRIGGER IF NOT EXISTS trg_plan_tasks_complete_task
AFTER UPDATE OF status ON tasks
WHEN NEW.status = 'done' AND OLD.status != 'done'
BEGIN
  UPDATE plan_tasks
  SET resolution = 'completed', resolved_at = datetime('now')
  WHERE task_id = NEW.id AND resolution IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_plan_tasks_reopen_task
AFTER UPDATE OF status ON tasks
WHEN NEW.status = 'todo' AND OLD.status = 'done'
BEGIN
  UPDATE plan_tasks
  SET resolution = NULL, resolved_at = NULL
  WHERE task_id = NEW.id AND resolution = 'completed';
END;

CREATE TRIGGER IF NOT EXISTS trg_plan_tasks_abandon_task
AFTER UPDATE OF status ON tasks
WHEN NEW.status = 'abandoned' AND OLD.status != 'abandoned'
BEGIN
  UPDATE plan_tasks
  SET resolution = 'abandoned', resolved_at = datetime('now')
  WHERE task_id = NEW.id AND resolution IS NULL;
END;
