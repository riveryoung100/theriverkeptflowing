# ADR-013: Deterministic Workflow Step Handlers

## Status

Accepted

## Context

Workflow ordering alone does not execute subsystem work.

The orchestration engine requires a controlled dispatch mechanism that maps workflow step types to executable handlers.

## Decision

The River Orchestration Engine uses a deterministic workflow step handler registry.

Each workflow step type may have exactly one registered handler within a registry.

Handlers receive an immutable execution context and return validated outputs.

Missing handlers and duplicate registrations are rejected.

## Consequences

Benefits:

- Explicit subsystem dispatch
- Deterministic testing
- Replaceable adapters
- Clear execution boundaries
- Auditable outputs
- Safe future integration

Trade-offs:

- Registry configuration is required
- Handler contracts add validation overhead
- Real subsystem adapters remain future work

These trade-offs are accepted because explicit deterministic dispatch is required before retries, persistence, review gates, and background execution can be introduced.
