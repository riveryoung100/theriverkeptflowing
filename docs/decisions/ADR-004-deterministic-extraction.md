# ADR-004: Deterministic Extraction

## Status

Accepted

## Context

Extraction is the first processing stage that converts immutable source assets into normalized records.

Downstream systems depend on extraction being reproducible so provenance can always be verified.

## Decision

The initial Extraction Engine is deterministic.

Given identical source assets, the engine must always produce equivalent extraction results.

Future AI-assisted extraction layers must preserve deterministic metadata and provenance.

Every extraction:

- References its source asset
- Receives a durable extraction identifier
- Produces validated output
- Preserves traceability

## Consequences

Benefits:

- Reproducible processing
- Stable testing
- Reliable provenance
- Easier debugging
- Safe future AI integration

Trade-offs:

- Less flexibility initially
- AI providers introduced later

These trade-offs are accepted because deterministic processing establishes a trustworthy foundation for future intelligent extraction.
