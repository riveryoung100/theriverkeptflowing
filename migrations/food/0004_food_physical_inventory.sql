PRAGMA foreign_keys = ON;

-- Definition only. Calendar validity is owned by canonical application validation.
CREATE TABLE IF NOT EXISTS food_production_batches (
    batch_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    sku_id TEXT NOT NULL,
    sku_version INTEGER NOT NULL,
    batch_code TEXT NOT NULL,
    storage_mode TEXT NOT NULL,
    produced_package_count INTEGER NOT NULL,
    prepared_on TEXT NOT NULL,
    frozen_on TEXT,
    attribution TEXT NOT NULL,
    source_reference TEXT NOT NULL,
    PRIMARY KEY (batch_id, version),
    CHECK (typeof(version) = 'integer' AND version >= 1 AND version <= 9007199254740991),
    CHECK (typeof(sku_version) = 'integer' AND sku_version >= 1 AND sku_version <= 9007199254740991),
    CHECK (typeof(produced_package_count) = 'integer' AND produced_package_count >= 1 AND produced_package_count <= 9007199254740991),
    CHECK (length(batch_id) >= 1 AND length(batch_id) <= 512 AND trim(batch_id) = batch_id),
    CHECK (length(sku_id) >= 1 AND length(sku_id) <= 512 AND trim(sku_id) = sku_id),
    CHECK (length(batch_code) >= 1 AND length(batch_code) <= 512 AND trim(batch_code) = batch_code),
    CHECK (length(attribution) >= 1 AND length(attribution) <= 512 AND trim(attribution) = attribution),
    CHECK (length(source_reference) >= 1 AND length(source_reference) <= 512 AND trim(source_reference) = source_reference),
    CHECK (storage_mode IN ('refrigerated', 'frozen', 'room-temperature')),
    CHECK ((storage_mode = 'frozen' AND frozen_on IS NOT NULL)
        OR (storage_mode != 'frozen' AND frozen_on IS NULL)),
    CHECK (length(prepared_on) = 10 AND prepared_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    CHECK (frozen_on IS NULL OR (length(frozen_on) = 10 AND frozen_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')),
    CHECK (frozen_on IS NULL OR frozen_on >= prepared_on)
);

CREATE TABLE IF NOT EXISTS food_physical_inventory_movements (
    movement_id TEXT NOT NULL PRIMARY KEY,
    batch_id TEXT NOT NULL,
    batch_version INTEGER NOT NULL,
    sku_id TEXT NOT NULL,
    sku_version INTEGER NOT NULL,
    movement_type TEXT NOT NULL,
    package_count INTEGER NOT NULL,
    occurred_on TEXT NOT NULL,
    attribution TEXT NOT NULL,
    source_reference TEXT NOT NULL,
    FOREIGN KEY (batch_id, batch_version)
        REFERENCES food_production_batches (batch_id, version),
    CHECK (typeof(batch_version) = 'integer' AND batch_version >= 1 AND batch_version <= 9007199254740991),
    CHECK (typeof(sku_version) = 'integer' AND sku_version >= 1 AND sku_version <= 9007199254740991),
    CHECK (typeof(package_count) = 'integer' AND package_count >= 1 AND package_count <= 9007199254740991),
    CHECK (length(movement_id) >= 1 AND length(movement_id) <= 512 AND trim(movement_id) = movement_id),
    CHECK (length(batch_id) >= 1 AND length(batch_id) <= 512 AND trim(batch_id) = batch_id),
    CHECK (length(sku_id) >= 1 AND length(sku_id) <= 512 AND trim(sku_id) = sku_id),
    CHECK (length(attribution) >= 1 AND length(attribution) <= 512 AND trim(attribution) = attribution),
    CHECK (length(source_reference) >= 1 AND length(source_reference) <= 512 AND trim(source_reference) = source_reference),
    CHECK (movement_type IN ('adjustment-in', 'adjustment-out', 'waste')),
    CHECK (length(occurred_on) = 10 AND occurred_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);

CREATE TRIGGER IF NOT EXISTS food_production_batches_no_update
BEFORE UPDATE ON food_production_batches
BEGIN
    SELECT RAISE(ABORT, 'food production batches are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_production_batches_no_delete
BEFORE DELETE ON food_production_batches
BEGIN
    SELECT RAISE(ABORT, 'food production batches are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_physical_inventory_movements_no_update
BEFORE UPDATE ON food_physical_inventory_movements
BEGIN
    SELECT RAISE(ABORT, 'food physical inventory movements are immutable');
END;

CREATE TRIGGER IF NOT EXISTS food_physical_inventory_movements_no_delete
BEFORE DELETE ON food_physical_inventory_movements
BEGIN
    SELECT RAISE(ABORT, 'food physical inventory movements are immutable');
END;
