# ADR-003: Lineage Graph

## Status

Accepted

## Context

Every transformation inside the Assimilation Engine produces new durable records.

Without explicit lineage, downstream knowledge cannot explain where information originated or how it was produced.

## Decision

The Assimilation Engine represents provenance as a directed acyclic graph (DAG).

Each node represents a durable record.

Each edge represents a provenance relationship.

Traversal is supported in both directions:

- Parent traversal
- Child traversal
- Recursive ancestry
- Recursive descendants

Cycle detection prevents invalid provenance graphs.

## Consequences

Benefits:

- Complete provenance
- Explainable processing
- Deterministic traversal
- Safe reprocessing
- Auditability

Trade-offs:

- Additional graph maintenance
- Validation complexity

These costs are accepted because provenance is a foundational architectural requirement.
