CREATE TABLE IF NOT EXISTS river_crm_insurance_acquisition_costs (
    cost_id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL,
    category TEXT NOT NULL
        CHECK (
            category IN (
                'lead',
                'advertising',
                'setter',
                'platform',
                'data',
                'creative',
                'other'
            )
        ),
    amount_minor_units INTEGER NOT NULL
        CHECK (amount_minor_units >= 0),
    currency TEXT NOT NULL
        CHECK (length(currency) = 3),
    occurred_at TEXT NOT NULL,
    source TEXT,
    vendor TEXT,
    campaign TEXT,
    external_reference TEXT,
    note TEXT,

    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships(relationship_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
    idx_river_crm_insurance_acquisition_costs_relationship_occurred
ON river_crm_insurance_acquisition_costs (
    relationship_id,
    occurred_at DESC
);


CREATE TABLE IF NOT EXISTS river_crm_insurance_premium_facts (
    premium_fact_id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL,
    kind TEXT NOT NULL
        CHECK (
            kind IN (
                'quoted',
                'written',
                'renewal'
            )
        ),
    amount_minor_units INTEGER NOT NULL
        CHECK (amount_minor_units >= 0),
    currency TEXT NOT NULL
        CHECK (length(currency) = 3),
    occurred_at TEXT NOT NULL,
    provider_reference TEXT,
    policy_reference TEXT,
    effective_at TEXT,
    external_reference TEXT,

    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships(relationship_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
    idx_river_crm_insurance_premium_facts_relationship_occurred
ON river_crm_insurance_premium_facts (
    relationship_id,
    occurred_at DESC
);


CREATE TABLE IF NOT EXISTS river_crm_insurance_commission_facts (
    commission_fact_id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL,
    kind TEXT NOT NULL
        CHECK (
            kind IN (
                'earned',
                'paid',
                'chargeback',
                'adjustment'
            )
        ),
    amount_minor_units INTEGER NOT NULL,
    currency TEXT NOT NULL
        CHECK (length(currency) = 3),
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
    idx_river_crm_insurance_commission_facts_relationship_occurred
ON river_crm_insurance_commission_facts (
    relationship_id,
    occurred_at DESC
);


CREATE TABLE IF NOT EXISTS river_crm_insurance_renewal_facts (
    renewal_fact_id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL,
    kind TEXT NOT NULL
        CHECK (
            kind IN (
                'due',
                'quoted',
                'renewed',
                'lost'
            )
        ),
    occurred_at TEXT NOT NULL,
    provider_reference TEXT,
    policy_reference TEXT,
    effective_at TEXT,
    external_reference TEXT,
    note TEXT,

    FOREIGN KEY (relationship_id)
        REFERENCES river_crm_relationships(relationship_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
    idx_river_crm_insurance_renewal_facts_relationship_occurred
ON river_crm_insurance_renewal_facts (
    relationship_id,
    occurred_at DESC
);
