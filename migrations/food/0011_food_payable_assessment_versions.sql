-- FOOD-008G: declarative migration only; not executed by local implementation.
-- Historical assessment assertions, not policy authorization, current payable
-- selection, payment, settlement, fulfillment, refund or accounting authority.
-- SQL protects coordinates/history. The adapter authenticates JSON/domain rules.
-- Verify parent migration 0008 and runtime FK enforcement before integration.

CREATE TABLE IF NOT EXISTS food_payable_assessment_versions (
    assessment_id TEXT NOT NULL COLLATE BINARY
        CHECK (substr(assessment_id, 1, length('food-payable-assessment:')) = 'food-payable-assessment:'
            -- replace NUL before length: SQLite text length otherwise stops there.
            -- Code-point bounds supplement, not replace, adapter UTF-16 bounds.
            AND length(replace(assessment_id, char(0), 'x'))
                BETWEEN length('food-payable-assessment:') + 1 AND length('food-payable-assessment:') + 200
            AND instr(substr(assessment_id, length('food-payable-assessment:') + 1), ':') = 0),
    assessment_version INTEGER NOT NULL
        CHECK (assessment_version BETWEEN 1 AND 9007199254740991),
    order_id TEXT NOT NULL COLLATE BINARY
        CHECK (substr(order_id, 1, length('food-physical-order:')) = 'food-physical-order:'
            AND length(replace(order_id, char(0), 'x'))
                BETWEEN length('food-physical-order:') + 1 AND length('food-physical-order:') + 128
            AND instr(substr(order_id, length('food-physical-order:') + 1), ':') = 0),
    order_version INTEGER NOT NULL CHECK (order_version IN (1, 2)),
    snapshot_format_version INTEGER NOT NULL CHECK (snapshot_format_version = 1),
    snapshot_json TEXT NOT NULL
        CHECK (length(snapshot_json) > 1
            AND CASE WHEN json_valid(snapshot_json)
                THEN json_type(snapshot_json) = 'object' ELSE 0 END),
    PRIMARY KEY (assessment_id, assessment_version),
    FOREIGN KEY (order_id, order_version)
        REFERENCES food_physical_order_versions (order_id, order_version)
) STRICT;

CREATE TRIGGER IF NOT EXISTS food_payable_assessment_versions_order_guard
BEFORE INSERT ON food_payable_assessment_versions
BEGIN
    SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM food_physical_order_versions AS parent
        WHERE parent.order_id = NEW.order_id AND parent.order_version = NEW.order_version
    ) THEN RAISE(ABORT, 'assessment requires exact physical order') END;
END;

CREATE TRIGGER IF NOT EXISTS food_payable_assessment_versions_initial_guard
BEFORE INSERT ON food_payable_assessment_versions
WHEN NEW.assessment_version = 1
BEGIN
    SELECT CASE WHEN EXISTS (
        SELECT 1 FROM food_payable_assessment_versions AS existing
        WHERE existing.assessment_id = NEW.assessment_id
    ) THEN RAISE(ABORT, 'assessment initial version conflicts with history') END;
END;

CREATE TRIGGER IF NOT EXISTS food_payable_assessment_versions_revision_guard
BEFORE INSERT ON food_payable_assessment_versions
WHEN NEW.assessment_version > 1
BEGIN
    SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM food_payable_assessment_versions AS predecessor
        WHERE predecessor.assessment_id = NEW.assessment_id
          AND predecessor.assessment_version = NEW.assessment_version - 1
          AND predecessor.order_id = NEW.order_id
          AND predecessor.order_version = NEW.order_version
    ) THEN RAISE(ABORT, 'assessment requires exact consecutive predecessor and order') END;
END;

CREATE TRIGGER IF NOT EXISTS food_payable_assessment_versions_no_update
BEFORE UPDATE ON food_payable_assessment_versions
BEGIN
    SELECT RAISE(ABORT, 'payable assessment versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_payable_assessment_versions_no_delete
BEFORE DELETE ON food_payable_assessment_versions
BEGIN
    SELECT RAISE(ABORT, 'payable assessment versions are append-only');
END;
