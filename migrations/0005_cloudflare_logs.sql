CREATE TABLE IF NOT EXISTS cloudflare_logs (
 id TEXT PRIMARY KEY,
 tenant_id TEXT NOT NULL,
 owner_hash TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 status INTEGER NOT NULL,
 details TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cloudflare_logs_owner ON cloudflare_logs(tenant_id,owner_hash,id);
