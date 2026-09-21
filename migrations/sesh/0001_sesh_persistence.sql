CREATE TABLE IF NOT EXISTS sesh_projects (
    project_id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    revision INTEGER NULL,
    stored_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesh_audio_assets (
    audio_asset_id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    revision INTEGER NULL,
    stored_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sesh_audio_assets_project_id
    ON sesh_audio_assets(project_id);
