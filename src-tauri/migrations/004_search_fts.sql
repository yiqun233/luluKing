-- R1.1：跨实体 FTS5 搜索索引

CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
  entity_type UNINDEXED,
  entity_id UNINDEXED,
  content,
  tokenize = 'unicode61'
);

INSERT INTO search_fts (entity_type, entity_id, content)
SELECT 'task', id, title || ' ' || COALESCE(notes, '') FROM tasks WHERE deleted_at IS NULL;
INSERT INTO search_fts (entity_type, entity_id, content)
SELECT 'note', id, COALESCE(title, '') || ' ' || content FROM notes WHERE deleted_at IS NULL;
INSERT INTO search_fts (entity_type, entity_id, content)
SELECT 'project', id, title || ' ' || COALESCE(notes, '') FROM projects WHERE deleted_at IS NULL;
INSERT INTO search_fts (entity_type, entity_id, content)
SELECT 'goal', id, title || ' ' || COALESCE(notes, '') FROM goals WHERE deleted_at IS NULL;
INSERT INTO search_fts (entity_type, entity_id, content)
SELECT 'habit', id, title FROM habits WHERE deleted_at IS NULL;
INSERT INTO search_fts (entity_type, entity_id, content)
SELECT 'event', id, title FROM events WHERE deleted_at IS NULL;
INSERT INTO search_fts (entity_type, entity_id, content)
SELECT 'review', id, type || ' ' || COALESCE(auto_summary, '') || ' ' || COALESCE(content, '') FROM reviews WHERE deleted_at IS NULL;
INSERT INTO search_fts (entity_type, entity_id, content)
SELECT 'tag', id, name FROM tags WHERE deleted_at IS NULL AND status = 'active';

CREATE TRIGGER IF NOT EXISTS search_fts_tasks_insert AFTER INSERT ON tasks
WHEN NEW.deleted_at IS NULL BEGIN
  INSERT INTO search_fts (entity_type, entity_id, content) VALUES ('task', NEW.id, NEW.title || ' ' || COALESCE(NEW.notes, ''));
END;
CREATE TRIGGER IF NOT EXISTS search_fts_tasks_update AFTER UPDATE ON tasks BEGIN
  DELETE FROM search_fts WHERE entity_type = 'task' AND entity_id = NEW.id;
  INSERT INTO search_fts (entity_type, entity_id, content)
    SELECT 'task', NEW.id, NEW.title || ' ' || COALESCE(NEW.notes, '') WHERE NEW.deleted_at IS NULL;
END;
CREATE TRIGGER IF NOT EXISTS search_fts_tasks_delete AFTER DELETE ON tasks BEGIN
  DELETE FROM search_fts WHERE entity_type = 'task' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS search_fts_notes_insert AFTER INSERT ON notes
WHEN NEW.deleted_at IS NULL BEGIN
  INSERT INTO search_fts (entity_type, entity_id, content) VALUES ('note', NEW.id, COALESCE(NEW.title, '') || ' ' || NEW.content);
END;
CREATE TRIGGER IF NOT EXISTS search_fts_notes_update AFTER UPDATE ON notes BEGIN
  DELETE FROM search_fts WHERE entity_type = 'note' AND entity_id = NEW.id;
  INSERT INTO search_fts (entity_type, entity_id, content)
    SELECT 'note', NEW.id, COALESCE(NEW.title, '') || ' ' || NEW.content WHERE NEW.deleted_at IS NULL;
END;
CREATE TRIGGER IF NOT EXISTS search_fts_notes_delete AFTER DELETE ON notes BEGIN
  DELETE FROM search_fts WHERE entity_type = 'note' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS search_fts_projects_insert AFTER INSERT ON projects
WHEN NEW.deleted_at IS NULL BEGIN
  INSERT INTO search_fts (entity_type, entity_id, content) VALUES ('project', NEW.id, NEW.title || ' ' || COALESCE(NEW.notes, ''));
END;
CREATE TRIGGER IF NOT EXISTS search_fts_projects_update AFTER UPDATE ON projects BEGIN
  DELETE FROM search_fts WHERE entity_type = 'project' AND entity_id = NEW.id;
  INSERT INTO search_fts (entity_type, entity_id, content)
    SELECT 'project', NEW.id, NEW.title || ' ' || COALESCE(NEW.notes, '') WHERE NEW.deleted_at IS NULL;
END;
CREATE TRIGGER IF NOT EXISTS search_fts_projects_delete AFTER DELETE ON projects BEGIN
  DELETE FROM search_fts WHERE entity_type = 'project' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS search_fts_goals_insert AFTER INSERT ON goals
WHEN NEW.deleted_at IS NULL BEGIN
  INSERT INTO search_fts (entity_type, entity_id, content) VALUES ('goal', NEW.id, NEW.title || ' ' || COALESCE(NEW.notes, ''));
END;
CREATE TRIGGER IF NOT EXISTS search_fts_goals_update AFTER UPDATE ON goals BEGIN
  DELETE FROM search_fts WHERE entity_type = 'goal' AND entity_id = NEW.id;
  INSERT INTO search_fts (entity_type, entity_id, content)
    SELECT 'goal', NEW.id, NEW.title || ' ' || COALESCE(NEW.notes, '') WHERE NEW.deleted_at IS NULL;
END;
CREATE TRIGGER IF NOT EXISTS search_fts_goals_delete AFTER DELETE ON goals BEGIN
  DELETE FROM search_fts WHERE entity_type = 'goal' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS search_fts_habits_insert AFTER INSERT ON habits
WHEN NEW.deleted_at IS NULL BEGIN
  INSERT INTO search_fts (entity_type, entity_id, content) VALUES ('habit', NEW.id, NEW.title);
END;
CREATE TRIGGER IF NOT EXISTS search_fts_habits_update AFTER UPDATE ON habits BEGIN
  DELETE FROM search_fts WHERE entity_type = 'habit' AND entity_id = NEW.id;
  INSERT INTO search_fts (entity_type, entity_id, content)
    SELECT 'habit', NEW.id, NEW.title WHERE NEW.deleted_at IS NULL;
END;
CREATE TRIGGER IF NOT EXISTS search_fts_habits_delete AFTER DELETE ON habits BEGIN
  DELETE FROM search_fts WHERE entity_type = 'habit' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS search_fts_events_insert AFTER INSERT ON events
WHEN NEW.deleted_at IS NULL BEGIN
  INSERT INTO search_fts (entity_type, entity_id, content) VALUES ('event', NEW.id, NEW.title);
END;
CREATE TRIGGER IF NOT EXISTS search_fts_events_update AFTER UPDATE ON events BEGIN
  DELETE FROM search_fts WHERE entity_type = 'event' AND entity_id = NEW.id;
  INSERT INTO search_fts (entity_type, entity_id, content)
    SELECT 'event', NEW.id, NEW.title WHERE NEW.deleted_at IS NULL;
END;
CREATE TRIGGER IF NOT EXISTS search_fts_events_delete AFTER DELETE ON events BEGIN
  DELETE FROM search_fts WHERE entity_type = 'event' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS search_fts_reviews_insert AFTER INSERT ON reviews
WHEN NEW.deleted_at IS NULL BEGIN
  INSERT INTO search_fts (entity_type, entity_id, content) VALUES ('review', NEW.id, NEW.type || ' ' || COALESCE(NEW.auto_summary, '') || ' ' || COALESCE(NEW.content, ''));
END;
CREATE TRIGGER IF NOT EXISTS search_fts_reviews_update AFTER UPDATE ON reviews BEGIN
  DELETE FROM search_fts WHERE entity_type = 'review' AND entity_id = NEW.id;
  INSERT INTO search_fts (entity_type, entity_id, content)
    SELECT 'review', NEW.id, NEW.type || ' ' || COALESCE(NEW.auto_summary, '') || ' ' || COALESCE(NEW.content, '') WHERE NEW.deleted_at IS NULL;
END;
CREATE TRIGGER IF NOT EXISTS search_fts_reviews_delete AFTER DELETE ON reviews BEGIN
  DELETE FROM search_fts WHERE entity_type = 'review' AND entity_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS search_fts_tags_insert AFTER INSERT ON tags
WHEN NEW.deleted_at IS NULL AND NEW.status = 'active' BEGIN
  INSERT INTO search_fts (entity_type, entity_id, content) VALUES ('tag', NEW.id, NEW.name);
END;
CREATE TRIGGER IF NOT EXISTS search_fts_tags_update AFTER UPDATE ON tags BEGIN
  DELETE FROM search_fts WHERE entity_type = 'tag' AND entity_id = NEW.id;
  INSERT INTO search_fts (entity_type, entity_id, content)
    SELECT 'tag', NEW.id, NEW.name WHERE NEW.deleted_at IS NULL AND NEW.status = 'active';
END;
CREATE TRIGGER IF NOT EXISTS search_fts_tags_delete AFTER DELETE ON tags BEGIN
  DELETE FROM search_fts WHERE entity_type = 'tag' AND entity_id = OLD.id;
END;
