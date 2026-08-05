# ADR-011: Deterministic Knowledge Insights

## Status

Accepted

## Context

Reasoning results must become durable records that can be reviewed, versioned, audited, and reused throughout the River Operating System.

## Decision

The Insight Engine shall:

- Produce deterministic insight identifiers
- Preserve reasoning evidence
- Calculate deterministic confidence
- Require validation before persistence
- Support review workflows
- Never mutate reasoning results

## Consequences

Benefits

- Reproducible insight generation
- Stable downstream automation
- Auditability
- Versioned knowledge assets

Trade-offs

- No probabilistic ranking
- Human review retained for ambiguous insights
