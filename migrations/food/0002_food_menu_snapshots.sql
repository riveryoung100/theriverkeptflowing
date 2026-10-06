-- FOOD-002G definition. Execution authorized only in the isolated test harness.
CREATE TABLE food_dish_presentation_snapshots (
 dish_id TEXT NOT NULL COLLATE BINARY,
 version INTEGER NOT NULL CHECK(typeof(version)='integer' AND version BETWEEN 1 AND 9007199254740991),
 identity_order_key TEXT NOT NULL COLLATE BINARY,
 serialization_format_version INTEGER NOT NULL CHECK(serialization_format_version=1 AND typeof(serialization_format_version)='integer'),
 payload_json TEXT NOT NULL,
 product_id TEXT NOT NULL COLLATE BINARY,
 product_version INTEGER NOT NULL CHECK(typeof(product_version)='integer' AND product_version BETWEEN 1 AND 9007199254740991),
 recipe_id TEXT NOT NULL COLLATE BINARY,
 recipe_version INTEGER NOT NULL CHECK(typeof(recipe_version)='integer' AND recipe_version BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(dish_id,version)
);
CREATE TABLE food_serving_offer_snapshots (
 offer_id TEXT NOT NULL COLLATE BINARY,
 version INTEGER NOT NULL CHECK(typeof(version)='integer' AND version BETWEEN 1 AND 9007199254740991),
 identity_order_key TEXT NOT NULL COLLATE BINARY,
 serialization_format_version INTEGER NOT NULL CHECK(serialization_format_version=1 AND typeof(serialization_format_version)='integer'),
 payload_json TEXT NOT NULL,
 dish_id TEXT NOT NULL COLLATE BINARY,
 presentation_version INTEGER NOT NULL CHECK(typeof(presentation_version)='integer' AND presentation_version BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(offer_id,version),
 UNIQUE(offer_id,version,dish_id,presentation_version),
 FOREIGN KEY(dish_id,presentation_version) REFERENCES food_dish_presentation_snapshots(dish_id,version)
);
CREATE TABLE food_menu_publication_snapshots (
 publication_id TEXT NOT NULL COLLATE BINARY,
 version INTEGER NOT NULL CHECK(typeof(version)='integer' AND version BETWEEN 1 AND 9007199254740991),
 identity_order_key TEXT NOT NULL COLLATE BINARY,
 serialization_format_version INTEGER NOT NULL CHECK(serialization_format_version=1 AND typeof(serialization_format_version)='integer'),
 payload_json TEXT NOT NULL,
 PRIMARY KEY(publication_id,version)
);
CREATE TABLE food_offer_availability_observations (
 offer_id TEXT NOT NULL COLLATE BINARY,
 offer_version INTEGER NOT NULL CHECK(typeof(offer_version)='integer' AND offer_version BETWEEN 1 AND 9007199254740991),
 revision INTEGER NOT NULL CHECK(typeof(revision)='integer' AND revision BETWEEN 1 AND 9007199254740991),
 serialization_format_version INTEGER NOT NULL CHECK(serialization_format_version=1 AND typeof(serialization_format_version)='integer'),
 payload_json TEXT NOT NULL,
 PRIMARY KEY(offer_id,offer_version,revision),
 FOREIGN KEY(offer_id,offer_version) REFERENCES food_serving_offer_snapshots(offer_id,version)
);
CREATE TABLE food_menu_publication_presentation_memberships (
 publication_id TEXT NOT NULL COLLATE BINARY,
 publication_version INTEGER NOT NULL CHECK(typeof(publication_version)='integer' AND publication_version BETWEEN 1 AND 9007199254740991),
 dish_id TEXT NOT NULL COLLATE BINARY,
 presentation_version INTEGER NOT NULL CHECK(typeof(presentation_version)='integer' AND presentation_version BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(publication_id,publication_version,dish_id,presentation_version),
 FOREIGN KEY(publication_id,publication_version) REFERENCES food_menu_publication_snapshots(publication_id,version),
 FOREIGN KEY(dish_id,presentation_version) REFERENCES food_dish_presentation_snapshots(dish_id,version)
);
CREATE TABLE food_menu_publication_offer_memberships (
 publication_id TEXT NOT NULL COLLATE BINARY,
 publication_version INTEGER NOT NULL CHECK(typeof(publication_version)='integer' AND publication_version BETWEEN 1 AND 9007199254740991),
 offer_id TEXT NOT NULL COLLATE BINARY,
 offer_version INTEGER NOT NULL CHECK(typeof(offer_version)='integer' AND offer_version BETWEEN 1 AND 9007199254740991),
 dish_id TEXT NOT NULL COLLATE BINARY,
 presentation_version INTEGER NOT NULL CHECK(typeof(presentation_version)='integer' AND presentation_version BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(publication_id,publication_version,offer_id,offer_version),
 FOREIGN KEY(publication_id,publication_version) REFERENCES food_menu_publication_snapshots(publication_id,version),
 FOREIGN KEY(offer_id,offer_version,dish_id,presentation_version) REFERENCES food_serving_offer_snapshots(offer_id,version,dish_id,presentation_version),
 FOREIGN KEY(publication_id,publication_version,dish_id,presentation_version) REFERENCES food_menu_publication_presentation_memberships(publication_id,publication_version,dish_id,presentation_version)
);
CREATE INDEX food_dish_presentation_order ON food_dish_presentation_snapshots(identity_order_key COLLATE BINARY,dish_id,version);
CREATE INDEX food_serving_offer_order ON food_serving_offer_snapshots(identity_order_key COLLATE BINARY,offer_id,version);
CREATE INDEX food_menu_publication_order ON food_menu_publication_snapshots(identity_order_key COLLATE BINARY,publication_id,version);
CREATE INDEX food_serving_offer_presentation ON food_serving_offer_snapshots(dish_id,presentation_version);
CREATE TRIGGER food_serving_offer_stable_dish BEFORE INSERT ON food_serving_offer_snapshots
WHEN EXISTS(SELECT 1 FROM food_serving_offer_snapshots WHERE offer_id=NEW.offer_id AND dish_id<>NEW.dish_id)
BEGIN SELECT RAISE(ABORT,'Food offer dish association is immutable'); END;
CREATE TRIGGER food_menu_publication_members AFTER INSERT ON food_menu_publication_snapshots
BEGIN
 INSERT INTO food_menu_publication_presentation_memberships(publication_id,publication_version,dish_id,presentation_version)
 SELECT DISTINCT NEW.publication_id,NEW.version,json_extract(e.value,'$.presentation.dishId'),json_extract(e.value,'$.presentation.version')
 FROM json_each(NEW.payload_json,'$.snapshot.sections') s,json_each(s.value,'$.entries') e;
 INSERT INTO food_menu_publication_offer_memberships(publication_id,publication_version,offer_id,offer_version,dish_id,presentation_version)
 SELECT DISTINCT NEW.publication_id,NEW.version,json_extract(o.value,'$.offer.offerId'),json_extract(o.value,'$.offer.version'),json_extract(e.value,'$.presentation.dishId'),json_extract(e.value,'$.presentation.version')
 FROM json_each(NEW.payload_json,'$.snapshot.sections') s,json_each(s.value,'$.entries') e,json_each(e.value,'$.offers') o;
END;
CREATE TRIGGER food_dish_presentation_snapshots_no_update BEFORE UPDATE ON food_dish_presentation_snapshots
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_dish_presentation_snapshots_no_delete BEFORE DELETE ON food_dish_presentation_snapshots
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_serving_offer_snapshots_no_update BEFORE UPDATE ON food_serving_offer_snapshots
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_serving_offer_snapshots_no_delete BEFORE DELETE ON food_serving_offer_snapshots
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_menu_publication_snapshots_no_update BEFORE UPDATE ON food_menu_publication_snapshots
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_menu_publication_snapshots_no_delete BEFORE DELETE ON food_menu_publication_snapshots
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_offer_availability_observations_no_update BEFORE UPDATE ON food_offer_availability_observations
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_offer_availability_observations_no_delete BEFORE DELETE ON food_offer_availability_observations
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_menu_publication_presentation_memberships_no_update BEFORE UPDATE ON food_menu_publication_presentation_memberships
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_menu_publication_presentation_memberships_no_delete BEFORE DELETE ON food_menu_publication_presentation_memberships
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_menu_publication_offer_memberships_no_update BEFORE UPDATE ON food_menu_publication_offer_memberships
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
CREATE TRIGGER food_menu_publication_offer_memberships_no_delete BEFORE DELETE ON food_menu_publication_offer_memberships
BEGIN SELECT RAISE(ABORT,'Food menu history is immutable'); END;
