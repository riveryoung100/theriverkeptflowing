CREATE TABLE IF NOT EXISTS sesh_tracks (
    track_id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    revision INTEGER NULL,
    stored_at TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sesh_tracks_project_id
    ON sesh_tracks(project_id);