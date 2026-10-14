-- FOOD-006H
--
-- Definition-only migration.
-- DO NOT execute as part of FOOD-006H.
--
-- Establishes one shared append-only persistence-registration sequence
-- across production batches and physical inventory movements.
--
-- This sequence is infrastructure for a later explicit durable cutoff.
-- It does NOT itself establish:
--   * evidence completeness,
--   * a point-in-time inventory snapshot,
--   * current quantity-on-hand,
--   * availability,
--   * reservation-aware capacity,
--   * checkout/payment readiness,
--   * fulfillment completion,
--   * accounting or rewards authority.

CREATE TABLE IF NOT EXISTS food_inventory_evidence_sequence (
    evidence_sequence INTEGER PRIMARY KEY AUTOINCREMENT
        CHECK (
            evidence_sequence >= 1
            AND evidence_sequence <= 9007199254740991
        ),

    evidence_kind TEXT NOT NULL
        CHECK (
            evidence_kind IN (
                'production-batch',
                'physical-inventory-movement'
            )
        ),

    sku_id TEXT NOT NULL,
    sku_version INTEGER NOT NULL
        CHECK (
            sku_version >= 1
            AND sku_version <= 9007199254740991
        ),

    batch_id TEXT NOT NULL,
    batch_version INTEGER NOT NULL
        CHECK (
            batch_version >= 1
            AND batch_version <= 9007199254740991
        ),

    movement_id TEXT,

    CHECK (
        (
            evidence_kind = 'production-batch'
            AND movement_id IS NULL
        )
        OR
        (
            evidence_kind = 'physical-inventory-movement'
            AND movement_id IS NOT NULL
        )
    ),

    FOREIGN KEY (
        batch_id,
        batch_version
    )
    REFERENCES food_production_batches (
        batch_id,
        version
    ),

    FOREIGN KEY (
        movement_id
    )
    REFERENCES food_physical_inventory_movements (
        movement_id
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS
    food_inventory_evidence_sequence_batch_unique
ON food_inventory_evidence_sequence (
    batch_id COLLATE BINARY,
    batch_version
)
WHERE evidence_kind = 'production-batch';

CREATE UNIQUE INDEX IF NOT EXISTS
    food_inventory_evidence_sequence_movement_unique
ON food_inventory_evidence_sequence (
    movement_id COLLATE BINARY
)
WHERE evidence_kind = 'physical-inventory-movement';

CREATE INDEX IF NOT EXISTS
    food_inventory_evidence_sequence_sku_cutoff
ON food_inventory_evidence_sequence (
    sku_id COLLATE BINARY,
    sku_version,
    evidence_sequence
);

CREATE INDEX IF NOT EXISTS
    food_inventory_evidence_sequence_batch_cutoff
ON food_inventory_evidence_sequence (
    batch_id COLLATE BINARY,
    batch_version,
    evidence_sequence
);

-- Backfill rows that may exist before migration 0005 is applied.
--
-- The ordering below is deterministic for migration repeatability and
-- inspection. It does not claim to reconstruct historical insertion order.
--
-- All preexisting evidence receive a sequence before any later cutoff
-- acquired after successful migration completion.

INSERT OR IGNORE INTO food_inventory_evidence_sequence (
    evidence_kind,
    sku_id,
    sku_version,
    batch_id,
    batch_version,
    movement_id
)
SELECT
    'production-batch',
    batch.sku_id,
    batch.sku_version,
    batch.batch_id,
    batch.version,
    NULL
FROM food_production_batches AS batch
ORDER BY
    batch.sku_id COLLATE BINARY,
    batch.sku_version,
    batch.batch_id COLLATE BINARY,
    batch.version;

INSERT OR IGNORE INTO food_inventory_evidence_sequence (
    evidence_kind,
    sku_id,
    sku_version,
    batch_id,
    batch_version,
    movement_id
)
SELECT
    'physical-inventory-movement',
    movement.sku_id,
    movement.sku_version,
    movement.batch_id,
    movement.batch_version,
    movement.movement_id
FROM food_physical_inventory_movements AS movement
ORDER BY
    movement.sku_id COLLATE BINARY,
    movement.sku_version,
    movement.batch_id COLLATE BINARY,
    movement.batch_version,
    movement.movement_id COLLATE BINARY;

CREATE TRIGGER IF NOT EXISTS
    food_inventory_evidence_sequence_after_batch_insert
AFTER INSERT ON food_production_batches
BEGIN
    INSERT INTO food_inventory_evidence_sequence (
        evidence_kind,
        sku_id,
        sku_version,
        batch_id,
        batch_version,
        movement_id
    )
    VALUES (
        'production-batch',
        NEW.sku_id,
        NEW.sku_version,
        NEW.batch_id,
        NEW.version,
        NULL
    );
END;

CREATE TRIGGER IF NOT EXISTS
    food_inventory_evidence_sequence_after_movement_insert
AFTER INSERT ON food_physical_inventory_movements
BEGIN
    INSERT INTO food_inventory_evidence_sequence (
        evidence_kind,
        sku_id,
        sku_version,
        batch_id,
        batch_version,
        movement_id
    )
    VALUES (
        'physical-inventory-movement',
        NEW.sku_id,
        NEW.sku_version,
        NEW.batch_id,
        NEW.batch_version,
        NEW.movement_id
    );
END;

CREATE TRIGGER IF NOT EXISTS
    food_inventory_evidence_sequence_no_update
BEFORE UPDATE ON food_inventory_evidence_sequence
BEGIN
    SELECT RAISE(
        ABORT,
        'food inventory evidence sequence is immutable'
    );
END;

CREATE TRIGGER IF NOT EXISTS
    food_inventory_evidence_sequence_no_delete
BEFORE DELETE ON food_inventory_evidence_sequence
BEGIN
    SELECT RAISE(
        ABORT,
        'food inventory evidence sequence is immutable'
    );
END;
