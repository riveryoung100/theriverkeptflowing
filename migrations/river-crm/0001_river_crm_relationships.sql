CREATE TABLE IF NOT EXISTS river_crm_relationships (
    relationship_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (
        kind IN (
            'lead',
            'client',
            'recruit',
            'partner'
        )
    ),
    stage TEXT NOT NULL CHECK (
        stage IN (
            'new',
            'contacted',
            'qualified',
            'appointment-set',
            'proposal',
            'won',
            'lost',
            'nurture'
        )
    ),
    source TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    owner TEXT,
    next_follow_up_at TEXT,
    appointment_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_river_crm_relationships_updated_at
ON river_crm_relationships (
    updated_at DESC,
    relationship_id ASC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_relationships_stage
ON river_crm_relationships (
    stage,
    updated_at DESC
);

CREATE INDEX IF NOT EXISTS idx_river_crm_relationships_next_follow_up_at
ON river_crm_relationships (
    next_follow_up_at
)
WHERE next_follow_up_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_river_crm_relationships_appointment_at
ON river_crm_relationships (
    appointment_at
)
WHERE appointment_at IS NOT NULL;
