# ADR-010: Deterministic Knowledge Reasoning

## Status

Accepted

## Context

The Knowledge Engine can now create and query structured graph records.

The next subsystem must evaluate relationships and claims while preserving reproducibility, explainability, and graph integrity.

AI-generated conclusions introduced too early would make behavior difficult to test and audit.

## Decision

The first Knowledge Reasoning Engine is deterministic.

Given the same graph and reasoning request, the engine must return an equivalent conclusion, evidence set, traversal path, explanation, and warning set.

The initial engine supports:

- Support-path reasoning
- Contradiction checks
- Claim-evidence retrieval
- Shared-neighbor reasoning
- Transitive-relation reasoning

Every reasoning request is validated before execution.

Every referenced node and claim must exist in the graph.

The engine does not mutate the graph.

## Conclusions

The engine returns one of four conclusions:

- supported
- contradicted
- mixed
- unknown

## Evidence

Reasoning results expose the graph records used to produce the conclusion.

Evidence can contain:

- Nodes
- Relations
- Claims
- Relation paths

## Consequences

Benefits:

- Reproducible reasoning
- Deterministic testing
- Explainable conclusions
- Auditable evidence
- Safe downstream automation
- Stable future AI integration
- Preserved graph immutability

Trade-offs:

- Limited initial inference capability
- No probabilistic conclusions
- No semantic rule engine yet
- Advanced conflict resolution is deferred

These trade-offs are accepted because deterministic reasoning creates a trustworthy foundation for future intelligence.
