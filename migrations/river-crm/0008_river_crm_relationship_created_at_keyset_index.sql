CREATE INDEX IF NOT EXISTS
    idx_river_crm_relationships_created_at_keyset
ON river_crm_relationships (
    created_at DESC,
    relationship_id ASC
);
