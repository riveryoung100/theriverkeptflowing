# ADR-009: Deterministic Knowledge Query Engine

## Status

Accepted

## Context

Knowledge retrieval must be deterministic.

The same graph and the same request should always produce identical results.

This creates stable downstream reasoning, testing, caching, and reproducibility.

## Decision

The initial Knowledge Query Engine will:

- Never mutate the graph
- Execute deterministic traversal
- Validate every request
- Return repeatable ordering
- Support node, relation, claim, neighbor, and search queries

## Consequences

Benefits

- Stable behavior
- Deterministic testing
- Reliable caching
- Predictable downstream reasoning

Trade-offs

- Simpler search capabilities
- Advanced ranking deferred

These trade-offs establish a trustworthy retrieval layer before introducing intelligent search.
