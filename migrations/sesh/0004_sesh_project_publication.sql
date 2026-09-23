CREATE TABLE IF NOT EXISTS sesh_project_publication (
    project_id TEXT PRIMARY KEY NOT NULL,
    owner_creator_id TEXT NOT NULL,
    state TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sesh_project_publication_owner_creator
    ON sesh_project_publication(owner_creator_id);

CREATE INDEX IF NOT EXISTS idx_sesh_project_publication_state
    ON sesh_project_publication(state);