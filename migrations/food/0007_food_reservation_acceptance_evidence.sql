-- FOOD-007Y: durable reservation acceptance evidence persistence.
-- Declarative schema only. This migration is not executed by FOOD-007Y implementation work.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS food_reservation_acceptance_evidence (
    reservation_id TEXT NOT NULL,
    acceptance_id TEXT NOT NULL,
    acceptance_version INTEGER NOT NULL,
    attribution TEXT NOT NULL,
    source_reference TEXT NOT NULL,
    accepted_on TEXT NOT NULL,

    PRIMARY KEY (
        acceptance_id,
        acceptance_version
    ),

    UNIQUE (
        reservation_id
    ),

    FOREIGN KEY (
        reservation_id
    )
    REFERENCES food_capacity_reservations (
        reservation_id
    ),

    CHECK (
        length(reservation_id) >= 1
        AND length(reservation_id) <= 512
    ),

    CHECK (
        length(acceptance_id) >= 1
        AND length(acceptance_id) <= 512
    ),

    CHECK (
        acceptance_version = 1
    ),

    CHECK (
        length(attribution) >= 1
        AND length(attribution) <= 512
    ),

    CHECK (
        length(source_reference) >= 1
        AND length(source_reference) <= 512
    ),

    CHECK (
        length(accepted_on) = 10
        AND accepted_on GLOB
            '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    )
);

CREATE TRIGGER IF NOT EXISTS food_reservation_acceptance_evidence_no_update
BEFORE UPDATE ON food_reservation_acceptance_evidence
BEGIN
    SELECT RAISE(
        ABORT,
        'food reservation acceptance evidence is immutable'
    );
END;

CREATE TRIGGER IF NOT EXISTS food_reservation_acceptance_evidence_no_delete
BEFORE DELETE ON food_reservation_acceptance_evidence
BEGIN
    SELECT RAISE(
        ABORT,
        'food reservation acceptance evidence is immutable'
    );
END;
