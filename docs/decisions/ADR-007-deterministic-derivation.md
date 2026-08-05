# ADR-007: Deterministic Derivation

## Status

Accepted

## Context

Derivation converts classified and segmented source material into durable objects that can enter the Knowledge Engine.

These objects must remain traceable to their source assets, source segments, and originating transformations.

If derivation behavior is unstable or opaque, downstream knowledge cannot be reproduced, audited, corrected, or safely superseded.

## Decision

The initial Derivation Engine is deterministic.

Given the same valid derivation request, the engine produces an equivalent derived-object reference structure.

Every derived-object reference:

- Receives a durable derivative identifier
- References its originating asset
- References at least one source segment
- References the transformation that produced it
- Preserves review status
- Preserves record version
- Preserves schema version
- Produces validated output

Classification identifiers remain part of the derivation request until the core DerivedObjectReference contract is expanded to represent them directly.

## Consequences

Benefits:

- Reproducible derivation
- Complete segment lineage
- Complete transformation lineage
- Stable tests
- Auditable knowledge construction
- Safer future AI integration
- Predictable downstream processing

Trade-offs:

- Derived-object references do not yet contain full knowledge payloads
- Classification lineage is temporarily request-level metadata
- Advanced approval and supersession workflows are deferred

These trade-offs are accepted because deterministic derivation establishes a trustworthy boundary between assimilation and the future Knowledge Engine.
