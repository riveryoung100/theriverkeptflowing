CREATE TABLE IF NOT EXISTS river_crm_contact_attempts (
    attempt_id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL,
    trigger_event_id TEXT,
    channel TEXT NOT NULL
        CHECK (
            channel IN (
                'phone',
                'sms',
                'email'
            )
        ),
    intent TEXT NOT NULL
        CHECK (
            intent IN (
                'instant-contact',
                'callback'
            )
        ),
    state TEXT NOT NULL
        CHECK (
            state IN (
                'queued',
                'attempting',
                'connected',
                'completed',
                'failed',
                'canceled'
            )
        ),
    idempotency_key TEXT NOT NULL UNIQUE,
    provider TEXT,
    provider_reference TEXT,
    requested_at TEXT NOT NULL,
    attempted_at TEXT,
    connected_at TEXT,
    completed_at TEXT,
    failed_at TEXT,
    canceled_at TEXT,
    failure_code TEXT,
    failure_message TEXT,
    retryable INTEGER
        CHECK (
            retryable IS NULL OR
            retryable IN (0, 1)
        ),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    CHECK (
        provider_reference IS NULL OR
        provider IS NOT NULL
    ),

    CHECK (
        state = 'failed' OR
        (
            failed_at IS NULL AND
            failure_code IS NULL AND
            failure_message IS NULL AND
            retryable IS NULL
        )
    ),

    CHECK (
        state <> 'failed' OR
        (
            failed_at IS NOT NULL AND
            failure_code IS NOT NULL AND
            failure_message IS NOT NULL AND
            retryable IS NOT NULL
        )
    ),

    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships (
            relationship_id
        )
        ON DELETE CASCADE,

    FOREIGN KEY (trigger_event_id)
        REFERENCES river_crm_relationship_events (
            event_id
        )
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS
    idx_river_crm_contact_attempts_relationship_requested
ON river_crm_contact_attempts (
    relationship_id,
    requested_at DESC,
    attempt_id ASC
);

CREATE INDEX IF NOT EXISTS
    idx_river_crm_contact_attempts_state_updated
ON river_crm_contact_attempts (
    state,
    updated_at DESC,
    attempt_id ASC
);

CREATE UNIQUE INDEX IF NOT EXISTS
    idx_river_crm_contact_attempts_provider_reference
ON river_crm_contact_attempts (
    provider,
    provider_reference
)
WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS
    idx_river_crm_contact_attempts_trigger_event
ON river_crm_contact_attempts (
    trigger_event_id
)
WHERE trigger_event_id IS NOT NULL;


CREATE TABLE IF NOT EXISTS river_crm_contact_provider_events (
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    attempt_id TEXT,
    received_at TEXT NOT NULL,

    PRIMARY KEY (
        provider,
        provider_event_id
    ),

    FOREIGN KEY (attempt_id)
        REFERENCES river_crm_contact_attempts (
            attempt_id
        )
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS
    idx_river_crm_contact_provider_events_attempt
ON river_crm_contact_provider_events (
    attempt_id,
    received_at ASC
)
WHERE attempt_id IS NOT NULL;
