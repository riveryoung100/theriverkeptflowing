CREATE TABLE IF NOT EXISTS river_crm_insurance_acquisition_outcome_facts (
    outcome_fact_id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL,
    kind TEXT NOT NULL
        CHECK (
            kind IN (
                'quoted',
                'bound'
            )
        ),
    occurred_at TEXT NOT NULL,
    provider_reference TEXT,
    policy_reference TEXT,
    external_reference TEXT,
    note TEXT,

    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships(relationship_id)
        ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS
    idx_river_crm_insurance_outcome_facts_relationship_occurred
ON river_crm_insurance_acquisition_outcome_facts (
    relationship_id,
    occurred_at DESC,
    outcome_fact_id DESC
);


CREATE INDEX IF NOT EXISTS
    idx_river_crm_insurance_outcome_facts_kind_occurred
ON river_crm_insurance_acquisition_outcome_facts (
    kind,
    occurred_at DESC,
    relationship_id ASC
);
