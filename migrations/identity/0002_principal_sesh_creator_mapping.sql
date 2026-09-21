CREATE TABLE IF NOT EXISTS principal_sesh_creator_mappings (
    principal_id TEXT PRIMARY KEY NOT NULL,
    sesh_creator_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_principal_sesh_creator_mappings_creator
    ON principal_sesh_creator_mappings (sesh_creator_id);
