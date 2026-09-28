CREATE TABLE IF NOT EXISTS river_crm_contact_call_bridges (
    attempt_id TEXT PRIMARY KEY,

    state TEXT NOT NULL
        CHECK (
            state IN (
                'operator-dial-requested',
                'operator-answered',
                'lead-dial-requested',
                'lead-answered',
                'bridge-requested',
                'bridged',
                'completed',
                'failed'
            )
        ),

    operator_call_control_id TEXT,
    lead_call_control_id TEXT,
    failure_code TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (attempt_id)
        REFERENCES river_crm_contact_attempts (
            attempt_id
        )
        ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS
    idx_river_crm_contact_call_bridges_state
ON river_crm_contact_call_bridges (
    state,
    updated_at
);
