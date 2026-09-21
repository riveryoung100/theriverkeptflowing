CREATE TABLE IF NOT EXISTS principals (
    principal_id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    display_name TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS principal_password_credentials (
    principal_id TEXT PRIMARY KEY NOT NULL,
    email_normalized TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
