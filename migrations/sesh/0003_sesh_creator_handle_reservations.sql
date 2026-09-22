CREATE TABLE IF NOT EXISTS sesh_creator_handle_reservations (
    normalized_handle TEXT PRIMARY KEY NOT NULL,
    creator_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sesh_creator_handle_reservations_creator
    ON sesh_creator_handle_reservations(creator_id);