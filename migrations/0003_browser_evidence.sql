CREATE TABLE browser_evidence (
 case_id TEXT PRIMARY KEY REFERENCES cases(id), captured_at TEXT NOT NULL,
 metadata TEXT NOT NULL, image_base64 TEXT NOT NULL, received_at TEXT NOT NULL
);
