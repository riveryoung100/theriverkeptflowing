# ADR-005: Deterministic Segmentation

## Status

Accepted

## Context

Segmentation converts extraction output into durable semantic units.

Downstream classification, embeddings, indexing, and knowledge construction require stable segment boundaries.

## Decision

The initial Segmentation Engine is deterministic.

Given identical extraction input, the engine must always produce equivalent segmentation output.

Every segment:

- References its extraction
- Receives a durable segment identifier
- Produces validated output
- Preserves provenance

## Consequences

Benefits:

- Stable segmentation
- Deterministic testing
- Reliable provenance
- Predictable downstream processing
- Easier debugging

Trade-offs:

- Simpler initial segmentation
- Advanced semantic chunking deferred

These trade-offs are accepted because deterministic segmentation establishes a trustworthy foundation for future intelligent segmentation.
