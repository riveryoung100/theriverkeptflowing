-- FOOD-008E: declarative only. Do not execute in this development unit.
-- Immutable FOOD-005I cash payment evidence persistence.
-- Exact physical-order authentication remains an application boundary.
-- Cash receipt and confirmation source references are not globally unique.
-- This migration does not establish collector authenticity, paid-in-full,
-- payment readiness, settlement, fulfillment, accounting or rewards.

CREATE TABLE IF NOT EXISTS food_cash_payment_evidence (
    cash_evidence_id TEXT NOT NULL COLLATE BINARY
        CHECK (length(cash_evidence_id) BETWEEN 1 AND length('food-cash-payment-evidence:') + 200),

    cash_evidence_version INTEGER NOT NULL
        CHECK (cash_evidence_version = 1),

    order_id TEXT NOT NULL COLLATE BINARY
        CHECK (length(order_id) BETWEEN 1 AND length('food-physical-order:') + 128),

    order_version INTEGER NOT NULL
        CHECK (order_version IN (1, 2)),

    merchandise_subtotal_currency TEXT NOT NULL
        CHECK (length(merchandise_subtotal_currency) = 3
            AND merchandise_subtotal_currency GLOB '[A-Z][A-Z][A-Z]'),

    merchandise_subtotal_minor_units INTEGER NOT NULL
        CHECK (merchandise_subtotal_minor_units BETWEEN 0 AND 9007199254740991),

    channel TEXT NOT NULL
        CHECK (channel = 'cash'),

    cash_receipt_reference TEXT NOT NULL
        CHECK (length(cash_receipt_reference) BETWEEN 1 AND 500),

    confirmation_source_reference TEXT NOT NULL
        CHECK (length(confirmation_source_reference) BETWEEN 1 AND 500),

    received_amount_currency TEXT NOT NULL
        CHECK (length(received_amount_currency) = 3
            AND received_amount_currency GLOB '[A-Z][A-Z][A-Z]'),

    received_amount_minor_units INTEGER NOT NULL
        CHECK (received_amount_minor_units BETWEEN 0 AND 9007199254740991),

    PRIMARY KEY (cash_evidence_id, cash_evidence_version)
) STRICT;

CREATE TRIGGER IF NOT EXISTS food_cash_payment_evidence_no_update
BEFORE UPDATE ON food_cash_payment_evidence
BEGIN
    SELECT RAISE(ABORT, 'food cash payment evidence is immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_cash_payment_evidence_no_delete
BEFORE DELETE ON food_cash_payment_evidence
BEGIN
    SELECT RAISE(ABORT, 'food cash payment evidence is immutable');
END;
