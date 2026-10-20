CREATE TABLE IF NOT EXISTS food_capacity_reservation_fulfillment_intents (
    reservation_id TEXT NOT NULL PRIMARY KEY,
    fulfillment_intent_id TEXT NOT NULL,
    fulfillment_intent_version INTEGER NOT NULL,

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
        length(fulfillment_intent_id) >= 1
        AND length(fulfillment_intent_id) <= 512
    ),

    CHECK (
        fulfillment_intent_version >= 1
        AND fulfillment_intent_version <= 9007199254740991
    )
);

CREATE TRIGGER IF NOT EXISTS food_capacity_reservation_fulfillment_intents_no_update
BEFORE UPDATE ON food_capacity_reservation_fulfillment_intents
BEGIN
    SELECT RAISE(
        ABORT,
        'food capacity reservation fulfillment intents are immutable'
    );
END;

CREATE TRIGGER IF NOT EXISTS food_capacity_reservation_fulfillment_intents_no_delete
BEFORE DELETE ON food_capacity_reservation_fulfillment_intents
BEGIN
    SELECT RAISE(
        ABORT,
        'food capacity reservation fulfillment intents are immutable'
    );
END;
