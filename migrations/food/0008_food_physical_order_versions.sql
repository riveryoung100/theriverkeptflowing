-- FOOD-008A — Authoritative Physical Order Version Persistence
--
-- Declarative migration only.
-- This file is intentionally NOT executed by the FOOD-008A authoring workflow.
--
-- Durable authority:
--   append-only FOOD-005E physical-order version history only.
--
-- Non-authority:
--   reservation acceptance, checkout/payment readiness, payment,
--   preparation, dispatch, fulfillment, completed sale, inventory,
--   accounting and rewards.

CREATE TABLE IF NOT EXISTS food_physical_order_versions (
    order_id TEXT NOT NULL
        CHECK (length(order_id) BETWEEN 1 AND 512),

    order_version INTEGER NOT NULL
        CHECK (order_version IN (1, 2)),

    state TEXT NOT NULL
        CHECK (state IN ('requested', 'cancelled')),

    snapshot_format_version INTEGER NOT NULL
        CHECK (snapshot_format_version = 1),

    snapshot_json TEXT NOT NULL
        CHECK (
            length(snapshot_json) > 1
            AND json_valid(snapshot_json)
        ),

    PRIMARY KEY (
        order_id,
        order_version
    ),

    CHECK (
        (
            order_version = 1
            AND state = 'requested'
        )
        OR
        (
            order_version = 2
            AND state = 'cancelled'
        )
    )
) STRICT;

-- Version 1 is the only initial version and must be the first durable row
-- for an order identity.
CREATE TRIGGER IF NOT EXISTS food_physical_order_versions_initial_guard
BEFORE INSERT ON food_physical_order_versions
WHEN NEW.order_version = 1
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1
            FROM food_physical_order_versions AS existing
            WHERE existing.order_id = NEW.order_id
        )
        THEN RAISE(
            ABORT,
            'food physical order initial version conflicts with existing history'
        )
    END;
END;

-- Version 2 is the terminal FOOD-005E cancellation revision.
-- It must follow exact requested version 1 and preserve the entire
-- canonical non-state snapshot byte-for-byte.
CREATE TRIGGER IF NOT EXISTS food_physical_order_versions_cancel_guard
BEFORE INSERT ON food_physical_order_versions
WHEN NEW.order_version = 2
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM food_physical_order_versions AS predecessor
            WHERE predecessor.order_id = NEW.order_id
              AND predecessor.order_version = 1
              AND predecessor.state = 'requested'
              AND predecessor.snapshot_format_version =
                    NEW.snapshot_format_version
              AND predecessor.snapshot_json =
                    NEW.snapshot_json
        )
        THEN RAISE(
            ABORT,
            'food physical order cancellation lacks exact requested predecessor'
        )
    END;

    SELECT CASE
        WHEN EXISTS (
            SELECT 1
            FROM food_physical_order_versions AS terminal
            WHERE terminal.order_id = NEW.order_id
              AND terminal.order_version >= 2
        )
        THEN RAISE(
            ABORT,
            'food physical order cancellation is terminal'
        )
    END;
END;

CREATE TRIGGER IF NOT EXISTS food_physical_order_versions_no_update
BEFORE UPDATE ON food_physical_order_versions
BEGIN
    SELECT RAISE(
        ABORT,
        'food physical order versions are immutable'
    );
END;

CREATE TRIGGER IF NOT EXISTS food_physical_order_versions_no_delete
BEFORE DELETE ON food_physical_order_versions
BEGIN
    SELECT RAISE(
        ABORT,
        'food physical order versions are append-only'
    );
END;
