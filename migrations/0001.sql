CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
  role TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS request_logs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL, status INTEGER NOT NULL, code TEXT NOT NULL, details TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
  created_at TEXT NOT NULL, checkpoint TEXT NOT NULL, description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'captured', thread_id TEXT, submitted_at TEXT,
  tool_token_hash TEXT, tool_expires_at INTEGER, agent_error TEXT
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL, action TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cases_owner ON cases(tenant_id,user_id,created_at);
CREATE INDEX IF NOT EXISTS logs_owner ON request_logs(tenant_id,user_id,occurred_at);
