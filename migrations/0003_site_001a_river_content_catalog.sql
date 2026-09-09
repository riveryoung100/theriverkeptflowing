-- SITE-001A
-- River OS durable content-catalog read model.
--
-- Canonical assimilation records remain authoritative.
-- This table mirrors operational metadata for the web-based River OS and
-- must never redefine or mutate the originally published source.

CREATE TABLE IF NOT EXISTS river_content_catalog (
    source_id TEXT PRIMARY KEY NOT NULL,
    platform TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    external_platform_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    published_at TEXT NOT NULL,
    source_status TEXT NOT NULL,
    transcript_state TEXT NOT NULL,
    transcript_id TEXT,
    transcript_persisted_at TEXT,
    transcript_provider TEXT,
    transcript_language TEXT,
    ingested_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    original_source_preserved INTEGER NOT NULL CHECK (
        original_source_preserved = 1
    ),
    CHECK (
        transcript_state IN (
            'pending',
            'available'
        )
    ),
    CHECK (
        transcript_state = 'pending'
        OR (
            transcript_id IS NOT NULL
            AND transcript_persisted_at IS NOT NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_river_content_catalog_published
ON river_content_catalog (
    published_at DESC,
    source_id ASC
);

CREATE INDEX IF NOT EXISTS idx_river_content_catalog_transcript_state
ON river_content_catalog (
    transcript_state,
    published_at DESC
);
