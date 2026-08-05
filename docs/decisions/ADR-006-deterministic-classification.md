# ADR-006: Deterministic Classification

## Status

Accepted

## Context

Classification converts durable semantic segments into structured knowledge.

Knowledge construction depends on reproducible classification so identical input always produces equivalent semantic output.

## Decision

The initial Classification Engine is deterministic.

Given identical semantic segments, the engine must always produce equivalent classification results.

Every classification:

- References its originating segment
- Receives a durable classification identifier
- Produces validated output
- Preserves complete provenance

## Consequences

Benefits:

- Stable knowledge construction
- Deterministic testing
- Reliable provenance
- Predictable downstream reasoning
- Easier debugging

Trade-offs:

- Simpler initial classification
- Advanced AI classification deferred

These trade-offs are accepted because deterministic classification establishes a trustworthy foundation for future intelligent knowledge construction.
