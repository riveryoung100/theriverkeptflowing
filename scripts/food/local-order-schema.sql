-- FOOD-COMMERCE-003 LOCAL SYNTHETIC HARNESS ONLY.
-- Not a production migration. Never apply to a remote D1 binding.
-- One aggregate CAS contains order history, holds, quotes, inbox and receipts.
CREATE TABLE IF NOT EXISTS table_synthetic_order_store (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL CHECK (mode = 'local-synthetic-only'),
  format_version INTEGER NOT NULL CHECK (format_version = 1),
  revision INTEGER NOT NULL CHECK (revision >= 0),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);
