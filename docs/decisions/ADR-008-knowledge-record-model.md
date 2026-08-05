# ADR-008: Knowledge Record Model

## Status

Accepted

## Context

The Assimilation Engine converts immutable source assets into validated derived records.

The next subsystem requires a durable structure for representing usable knowledge while preserving complete provenance and supporting future retrieval, revision, conflict detection, and reasoning.

A single undifferentiated record type would make relationships, factual assertions, revisions, and validation difficult to manage.

## Decision

The Knowledge Engine uses four durable record categories:

- Knowledge nodes
- Knowledge relations
- Knowledge claims
- Knowledge revisions

Each record uses a typed prefixed UUID.

Supported identifier prefixes are:

- knowledge
- relation
- claim
- revision

Every knowledge record preserves:

- Record type
- Durable identifier
- Status
- Review state where applicable
- Version
- Schema version
- Provenance where applicable

## Nodes

Nodes represent durable subjects or concepts.

Nodes contain:

- Canonical name
- Aliases
- Node type
- Topic keys
- Domain keys
- Audience keys
- Visibility
- Status
- Provenance
- Version metadata

## Relations

Relations connect two existing knowledge nodes.

A relation cannot connect a node to itself.

Relations contain:

- Source node
- Target node
- Relation type
- Confidence
- Status
- Provenance
- Version metadata

## Claims

Claims represent structured assertions.

A claim must contain exactly one of:

- objectNodeId
- objectValue

Claims contain:

- Subject node
- Predicate
- Object
- Truth status
- Confidence
- Status
- Provenance
- Version metadata

## Revisions

Revisions preserve controlled changes to knowledge records.

The next version must equal the previous version plus one.

## Provenance

Knowledge records retain traceability to Assimilation Engine records, including:

- Asset identifiers
- Derivative identifiers
- Segment identifiers
- Classification identifiers
- Transformation identifiers

## Consequences

Benefits:

- Durable structured knowledge
- Complete provenance
- Typed identifiers
- Explicit claims
- Explicit relationships
- Auditable revisions
- Deterministic validation
- Stable downstream interfaces
- Future graph-query compatibility
- Future reasoning compatibility

Trade-offs:

- More record types
- More validation rules
- Additional provenance metadata
- Graph integrity must be maintained

These trade-offs are accepted because explicit knowledge records provide the stable foundation required for retrieval, intelligence, reasoning, and long-term system trust.
