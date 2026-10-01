CREATE TABLE IF NOT EXISTS river_crm_insurance_quote_request_submissions (
    idempotency_key TEXT PRIMARY KEY,
    request_fingerprint TEXT NOT NULL,
    relationship_id TEXT NOT NULL,
    created_at TEXT NOT NULL,

    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships (relationship_id)
        ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS
    idx_river_crm_insurance_quote_request_submissions_relationship_created
ON river_crm_insurance_quote_request_submissions (
    relationship_id,
    created_at DESC
);
