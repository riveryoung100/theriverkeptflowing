CREATE TABLE IF NOT EXISTS river_crm_acquisition_attribution (
    relationship_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_vendor TEXT,
    campaign TEXT,
    ad_or_creative_id TEXT,
    landing_page TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referral_source TEXT,
    captured_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships (relationship_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_river_crm_acquisition_source
ON river_crm_acquisition_attribution (
    source,
    captured_at DESC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_acquisition_utm_campaign
ON river_crm_acquisition_attribution (
    utm_campaign,
    captured_at DESC
)
WHERE utm_campaign IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_river_crm_acquisition_captured_at
ON river_crm_acquisition_attribution (
    captured_at DESC,
    relationship_id ASC
);

CREATE TABLE IF NOT EXISTS river_crm_contact_consents (
    consent_id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (
        channel IN (
            'phone',
            'sms',
            'email'
        )
    ),
    status TEXT NOT NULL CHECK (
        status IN (
            'granted',
            'denied',
            'revoked',
            'unknown'
        )
    ),
    consent_text_version TEXT,
    consent_source TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    revoked_at TEXT,
    do_not_contact INTEGER NOT NULL CHECK (
        do_not_contact IN (0, 1)
    ),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
        (
            status = 'revoked'
            AND revoked_at IS NOT NULL
        )
        OR
        (
            status <> 'revoked'
            AND revoked_at IS NULL
        )
    ),
    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships (relationship_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_river_crm_consents_relationship_channel
ON river_crm_contact_consents (
    relationship_id,
    channel,
    updated_at DESC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_consents_do_not_contact
ON river_crm_contact_consents (
    do_not_contact,
    updated_at DESC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_consents_updated_at
ON river_crm_contact_consents (
    updated_at DESC,
    consent_id ASC
);

CREATE TABLE IF NOT EXISTS river_crm_relationship_events (
    event_id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'lead-created',
            'quote-requested',
            'consent-captured',
            'consent-revoked',
            'stage-changed',
            'appointment-set',
            'callback-requested'
        )
    ),
    occurred_at TEXT NOT NULL,
    source TEXT NOT NULL,
    external_reference TEXT,
    metadata_json TEXT,
    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships (relationship_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_river_crm_events_relationship_occurred
ON river_crm_relationship_events (
    relationship_id,
    occurred_at ASC,
    event_id ASC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_events_type_occurred
ON river_crm_relationship_events (
    event_type,
    occurred_at DESC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_events_external_reference
ON river_crm_relationship_events (
    external_reference
)
WHERE external_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS river_crm_insurance_lead_profiles (
    relationship_id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    product_interest TEXT NOT NULL CHECK (
        product_interest IN (
            'auto',
            'home',
            'renters',
            'landlord',
            'umbrella',
            'life',
            'commercial',
            'other'
        )
    ),
    quote_status TEXT NOT NULL CHECK (
        quote_status IN (
            'not-started',
            'requested',
            'in-progress',
            'quoted',
            'bound',
            'declined',
            'lost'
        )
    ),
    assigned_producer TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships (relationship_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_river_crm_insurance_quote_status
ON river_crm_insurance_lead_profiles (
    quote_status,
    updated_at DESC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_insurance_product_interest
ON river_crm_insurance_lead_profiles (
    product_interest,
    updated_at DESC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_insurance_state
ON river_crm_insurance_lead_profiles (
    state,
    updated_at DESC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_insurance_assigned_producer
ON river_crm_insurance_lead_profiles (
    assigned_producer,
    updated_at DESC
)
WHERE assigned_producer IS NOT NULL;
