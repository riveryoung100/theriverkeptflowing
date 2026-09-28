CREATE TABLE IF NOT EXISTS river_crm_contact_call_correlations (
    attempt_id TEXT NOT NULL,

    leg_role TEXT NOT NULL
        CHECK (
            leg_role IN (
                'operator',
                'lead'
            )
        ),

    provider TEXT NOT NULL
        CHECK (
            provider = 'telnyx'
        ),

    provider_reference TEXT NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    PRIMARY KEY (
        attempt_id,
        leg_role
    ),

    UNIQUE (
        provider,
        provider_reference
    ),

    FOREIGN KEY (attempt_id)
        REFERENCES river_crm_contact_attempts (
            attempt_id
        )
        ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS
    idx_river_crm_contact_call_correlations_attempt
ON river_crm_contact_call_correlations (
    attempt_id,
    leg_role
);


CREATE INDEX IF NOT EXISTS
    idx_river_crm_contact_call_correlations_provider_reference
ON river_crm_contact_call_correlations (
    provider,
    provider_reference
);
