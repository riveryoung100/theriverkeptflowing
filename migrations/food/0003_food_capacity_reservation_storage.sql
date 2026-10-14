PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS food_sku_capacity_sources (
    sku_id TEXT NOT NULL,
    sku_version INTEGER NOT NULL,
    capacity_units INTEGER NOT NULL,
    revision INTEGER NOT NULL,
    attribution TEXT NOT NULL,
    source_reference TEXT NOT NULL,

    PRIMARY KEY (
        sku_id,
        sku_version
    ),

    CHECK (
        sku_version >= 1
        AND sku_version <= 9007199254740991
    ),

    CHECK (
        revision >= 1
        AND revision <= 9007199254740991
    ),

    CHECK (
        capacity_units >= 0
        AND capacity_units <= 9007199254740991
    ),

    CHECK (
        length(sku_id) >= 1
        AND length(sku_id) <= 512
    ),

    CHECK (
        length(attribution) >= 1
        AND length(attribution) <= 512
    ),

    CHECK (
        length(source_reference) >= 1
        AND length(source_reference) <= 512
    )
);

CREATE TABLE IF NOT EXISTS food_fulfillment_slot_capacity_sources (
    method TEXT NOT NULL,
    location_reference TEXT NOT NULL,
    window_reference TEXT NOT NULL,
    capacity_units INTEGER NOT NULL,
    revision INTEGER NOT NULL,
    attribution TEXT NOT NULL,
    source_reference TEXT NOT NULL,

    PRIMARY KEY (
        method,
        location_reference,
        window_reference
    ),

    CHECK (
        method IN (
            'personal-delivery',
            'meetup'
        )
    ),

    CHECK (
        revision >= 1
        AND revision <= 9007199254740991
    ),

    CHECK (
        capacity_units >= 0
        AND capacity_units <= 9007199254740991
    ),

    CHECK (
        length(location_reference) >= 1
        AND length(location_reference) <= 512
    ),

    CHECK (
        length(window_reference) >= 1
        AND length(window_reference) <= 512
    ),

    CHECK (
        length(attribution) >= 1
        AND length(attribution) <= 512
    ),

    CHECK (
        length(source_reference) >= 1
        AND length(source_reference) <= 512
    )
);

CREATE TABLE IF NOT EXISTS food_capacity_reservations (
    reservation_id TEXT NOT NULL PRIMARY KEY,
    order_id TEXT NOT NULL,
    order_version INTEGER NOT NULL,
    reservation_request_id TEXT NOT NULL,
    reservation_request_version INTEGER NOT NULL,
    canonical_demand_json TEXT NOT NULL,
    state TEXT NOT NULL,

    UNIQUE (
        order_id,
        order_version,
        reservation_request_id,
        reservation_request_version
    ),

    CHECK (
        order_version >= 1
        AND order_version <= 9007199254740991
    ),

    CHECK (
        reservation_request_version >= 1
        AND reservation_request_version <= 9007199254740991
    ),

    CHECK (
        state = 'held'
    ),

    CHECK (
        length(reservation_id) >= 1
        AND length(reservation_id) <= 512
    ),

    CHECK (
        length(order_id) >= 1
        AND length(order_id) <= 512
    ),

    CHECK (
        length(reservation_request_id) >= 1
        AND length(reservation_request_id) <= 512
    ),

    CHECK (
        length(canonical_demand_json) >= 2
    )
);

CREATE TABLE IF NOT EXISTS food_capacity_reservation_lines (
    reservation_id TEXT NOT NULL,
    line_index INTEGER NOT NULL,
    sku_id TEXT NOT NULL,
    sku_version INTEGER NOT NULL,
    quantity INTEGER NOT NULL,

    PRIMARY KEY (
        reservation_id,
        line_index
    ),

    FOREIGN KEY (
        reservation_id
    )
    REFERENCES food_capacity_reservations (
        reservation_id
    ),

    CHECK (
        line_index >= 0
        AND line_index <= 9007199254740991
    ),

    CHECK (
        sku_version >= 1
        AND sku_version <= 9007199254740991
    ),

    CHECK (
        quantity >= 1
        AND quantity <= 9007199254740991
    ),

    CHECK (
        length(sku_id) >= 1
        AND length(sku_id) <= 512
    ),

    UNIQUE (
        reservation_id,
        sku_id,
        sku_version
    )
);

CREATE TABLE IF NOT EXISTS food_fulfillment_slot_reservations (
    reservation_id TEXT NOT NULL PRIMARY KEY,
    method TEXT NOT NULL,
    location_reference TEXT NOT NULL,
    window_reference TEXT NOT NULL,
    quantity INTEGER NOT NULL,

    FOREIGN KEY (
        reservation_id
    )
    REFERENCES food_capacity_reservations (
        reservation_id
    ),

    CHECK (
        method IN (
            'personal-delivery',
            'meetup'
        )
    ),

    CHECK (
        quantity = 1
    ),

    CHECK (
        length(location_reference) >= 1
        AND length(location_reference) <= 512
    ),

    CHECK (
        length(window_reference) >= 1
        AND length(window_reference) <= 512
    )
);

CREATE TRIGGER IF NOT EXISTS food_capacity_reservations_no_update
BEFORE UPDATE ON food_capacity_reservations
BEGIN
    SELECT RAISE(ABORT, 'food capacity reservations are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_capacity_reservations_no_delete
BEFORE DELETE ON food_capacity_reservations
BEGIN
    SELECT RAISE(ABORT, 'food capacity reservations are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_capacity_reservation_lines_no_update
BEFORE UPDATE ON food_capacity_reservation_lines
BEGIN
    SELECT RAISE(ABORT, 'food capacity reservation lines are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_capacity_reservation_lines_no_delete
BEFORE DELETE ON food_capacity_reservation_lines
BEGIN
    SELECT RAISE(ABORT, 'food capacity reservation lines are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_fulfillment_slot_reservations_no_update
BEFORE UPDATE ON food_fulfillment_slot_reservations
BEGIN
    SELECT RAISE(ABORT, 'food fulfillment slot reservations are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_fulfillment_slot_reservations_no_delete
BEFORE DELETE ON food_fulfillment_slot_reservations
BEGIN
    SELECT RAISE(ABORT, 'food fulfillment slot reservations are immutable');
END;
