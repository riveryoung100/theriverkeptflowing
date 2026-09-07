-- PRODUCT-001E-07
-- Durable fulfillment persistence foundation.
--
-- PRODUCT-001D remains semantic authority for entitlement,
-- fulfillment-request, fulfillment-record identity and lifecycle.
--
-- D1 persists those canonical records without redefining them.

CREATE TABLE IF NOT EXISTS fulfillment_entitlements (
    entitlement_id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL,
    customer_reference TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_version TEXT NOT NULL,
    release_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked_at TEXT,

    UNIQUE (
        order_id,
        product_id,
        product_version,
        release_id
    )
);

CREATE TABLE IF NOT EXISTS fulfillment_requests (
    fulfillment_request_id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,
    product_version TEXT NOT NULL,
    customer_reference TEXT NOT NULL,
    delivery_email TEXT NOT NULL,
    payment_state TEXT NOT NULL,
    payment_reference TEXT NOT NULL,
    purchased_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fulfillment_records (
    fulfillment_id TEXT PRIMARY KEY NOT NULL,
    fulfillment_request_id TEXT NOT NULL UNIQUE,
    order_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,
    product_version TEXT NOT NULL,
    release_id TEXT NOT NULL,
    entitlement_id TEXT NOT NULL,
    fulfillment_state TEXT NOT NULL,
    delivery_state TEXT NOT NULL,
    delivery_attempted_at TEXT,
    delivered_at TEXT,
    failure_reason TEXT
);

