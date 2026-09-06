-- PRODUCT-001E-04
-- Durable commerce persistence foundation.
--
-- This table persists the existing canonical RiverOrder identity.
-- PRODUCT-001D remains the semantic authority for River order identity,
-- legitimate payment-state updates, and identity-drift rejection.
--
-- Amount preserves the existing canonical RiverOrder major-unit number.
-- D1 numeric storage must not redefine provider-independent amount semantics.

CREATE TABLE IF NOT EXISTS commerce_orders (
    order_id TEXT PRIMARY KEY NOT NULL,
    provider TEXT NOT NULL,
    provider_order_or_session_id TEXT NOT NULL UNIQUE,
    provider_payment_reference TEXT NOT NULL UNIQUE,
    customer_reference TEXT NOT NULL,
    delivery_email TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_version TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    payment_state TEXT NOT NULL,
    created_at TEXT NOT NULL,
    paid_at TEXT
);
