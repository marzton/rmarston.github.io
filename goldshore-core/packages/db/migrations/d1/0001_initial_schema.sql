-- 0001_initial_schema.sql
-- Initial schema for goldshore-platform D1 database.
-- Apply with: wrangler d1 migrations apply goldshore-platform

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  role       TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT    NOT NULL,
  payload    TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type       ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
