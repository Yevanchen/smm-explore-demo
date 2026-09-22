ALTER TABLE cases ADD COLUMN investigation_scope TEXT NOT NULL DEFAULT 'developer';
ALTER TABLE cases ADD COLUMN source_parent_id TEXT;
ALTER TABLE cases ADD COLUMN screenshot_requested_at INTEGER;
ALTER TABLE cases ADD COLUMN screenshot_declined_at INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS one_source_review_per_case ON cases(source_parent_id) WHERE source_parent_id IS NOT NULL;
