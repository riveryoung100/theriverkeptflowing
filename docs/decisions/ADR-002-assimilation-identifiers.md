# ADR-002: Assimilation Identifiers

## Status

Accepted

## Context

Every record produced by the Assimilation Engine requires a globally unique identifier that immediately communicates the record type while remaining stable for the lifetime of the object.

The system contains multiple durable record types including assets, extractions, segments, classifications, transformations, derivatives, and reviews.

Using unrelated identifier formats would complicate validation, debugging, lineage tracking, and future distributed processing.

## Decision

Every durable Assimilation Engine record uses a prefixed UUID.

The supported prefixes are:

- asset
- extraction
- segment
- classification
- transformation
- derivative
- review

Identifiers follow this format:

asset:<uuid>
extraction:<uuid>
segment:<uuid>
classification:<uuid>
transformation:<uuid>
derivative:<uuid>
review:<uuid>

The UUID portion uses the runtime UUID generator.

Validation always verifies:

- Valid prefix
- Valid UUID
- Correct record type

## Consequences

Benefits:

- Human-readable identifiers
- Strong runtime validation
- Consistent APIs
- Easier debugging
- Stable references
- Future distributed compatibility

Trade-offs:

- Slightly larger identifiers
- Prefix validation logic

These trade-offs are accepted because identifier consistency is fundamental to provenance, traceability, and long-term maintainability.
