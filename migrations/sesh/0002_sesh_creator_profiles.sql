CREATE TABLE IF NOT EXISTS sesh_creator_profiles (
    creator_id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    revision INTEGER NULL,
    stored_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
);