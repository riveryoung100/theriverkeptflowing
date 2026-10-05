-- FOOD-001C. Definition only; apply exclusively in the isolated test harness.
CREATE TABLE food_recipe_draft_snapshots (
    recipe_id TEXT NOT NULL COLLATE BINARY,
    version INTEGER NOT NULL CHECK (typeof(version) = 'integer' AND version BETWEEN 1 AND 9007199254740991),
    identity_order_key TEXT NOT NULL COLLATE BINARY,
    serialization_format_version INTEGER NOT NULL CHECK (typeof(serialization_format_version) = 'integer' AND serialization_format_version = 1),
    payload_json TEXT NOT NULL,
    PRIMARY KEY (recipe_id, version)
);
CREATE TABLE food_product_draft_snapshots (
    product_id TEXT NOT NULL COLLATE BINARY,
    version INTEGER NOT NULL CHECK (typeof(version) = 'integer' AND version BETWEEN 1 AND 9007199254740991),
    identity_order_key TEXT NOT NULL COLLATE BINARY,
    recipe_id TEXT NOT NULL COLLATE BINARY,
    recipe_version INTEGER NOT NULL CHECK (typeof(recipe_version) = 'integer' AND recipe_version BETWEEN 1 AND 9007199254740991),
    serialization_format_version INTEGER NOT NULL CHECK (typeof(serialization_format_version) = 'integer' AND serialization_format_version = 1),
    payload_json TEXT NOT NULL,
    PRIMARY KEY (product_id, version),
    FOREIGN KEY (recipe_id, recipe_version) REFERENCES food_recipe_draft_snapshots(recipe_id, version)
);
CREATE INDEX food_recipe_draft_order ON food_recipe_draft_snapshots(identity_order_key COLLATE BINARY, recipe_id, version);
CREATE INDEX food_product_draft_order ON food_product_draft_snapshots(identity_order_key COLLATE BINARY, product_id, version);
CREATE INDEX food_product_draft_recipe ON food_product_draft_snapshots(recipe_id, recipe_version);
CREATE TRIGGER food_recipe_draft_no_update BEFORE UPDATE ON food_recipe_draft_snapshots
BEGIN SELECT RAISE(ABORT, 'Food recipe history is immutable'); END;
CREATE TRIGGER food_recipe_draft_no_delete BEFORE DELETE ON food_recipe_draft_snapshots
BEGIN SELECT RAISE(ABORT, 'Food recipe history is immutable'); END;
CREATE TRIGGER food_product_draft_no_update BEFORE UPDATE ON food_product_draft_snapshots
BEGIN SELECT RAISE(ABORT, 'Food product history is immutable'); END;
CREATE TRIGGER food_product_draft_no_delete BEFORE DELETE ON food_product_draft_snapshots
BEGIN SELECT RAISE(ABORT, 'Food product history is immutable'); END;
