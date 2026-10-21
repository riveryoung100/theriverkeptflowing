-- FOOD-008C: declarative only. Do not execute in this development unit.
-- Records FOOD-005F evidence; does not authenticate a processor or establish
-- paid-in-full, reservation, readiness, fulfillment or accounting authority.
-- The runtime connection must enforce foreign keys independently of authoring.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS food_electronic_payment_confirmations (
    confirmation_id TEXT NOT NULL COLLATE BINARY
        CHECK (length(confirmation_id) BETWEEN 1 AND length('food-electronic-payment-confirmation:') + 128),
    confirmation_version INTEGER NOT NULL CHECK (confirmation_version = 1),
    order_id TEXT NOT NULL COLLATE BINARY
        CHECK (length(order_id) BETWEEN 1 AND length('food-physical-order:') + 128),
    order_version INTEGER NOT NULL CHECK (order_version IN (1, 2)),
    merchandise_subtotal_currency TEXT NOT NULL
        CHECK (length(merchandise_subtotal_currency) = 3
            AND merchandise_subtotal_currency GLOB '[A-Z][A-Z][A-Z]'),
    merchandise_subtotal_minor_units INTEGER NOT NULL
        CHECK (merchandise_subtotal_minor_units BETWEEN 0 AND 9007199254740991),
    channel TEXT NOT NULL CHECK (channel = 'electronic-processor'),
    processor TEXT NOT NULL CHECK (length(processor) BETWEEN 1 AND 128),
    processor_payment_reference TEXT NOT NULL
        CHECK (length(processor_payment_reference) BETWEEN 1 AND 512),
    confirmation_source_reference TEXT NOT NULL
        CHECK (length(confirmation_source_reference) BETWEEN 1 AND 512),
    confirmed_amount_currency TEXT NOT NULL
        CHECK (length(confirmed_amount_currency) = 3
            AND confirmed_amount_currency GLOB '[A-Z][A-Z][A-Z]'),
    confirmed_amount_minor_units INTEGER NOT NULL
        CHECK (confirmed_amount_minor_units BETWEEN 0 AND 9007199254740991),
    PRIMARY KEY (confirmation_id, confirmation_version),
    FOREIGN KEY (order_id, order_version)
        REFERENCES food_physical_order_versions (order_id, order_version)
) STRICT;

-- Processor/payment/source reference uniqueness is deliberately deferred:
-- their provider/account/environment namespaces have not been contracted.
CREATE TRIGGER IF NOT EXISTS food_electronic_payment_confirmations_no_update
BEFORE UPDATE ON food_electronic_payment_confirmations
BEGIN
    SELECT RAISE(ABORT, 'food electronic payment confirmations are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_electronic_payment_confirmations_no_delete
BEFORE DELETE ON food_electronic_payment_confirmations
BEGIN
    SELECT RAISE(ABORT, 'food electronic payment confirmations are immutable');
END;
