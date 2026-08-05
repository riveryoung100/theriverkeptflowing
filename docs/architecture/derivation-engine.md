# Derivation Engine Architecture

## Status

Phase 26F introduces the deterministic Derivation Engine for the Assimilation Engine.

The Derivation Engine converts classified semantic material into durable derived-object references while preserving source segments, transformation lineage, review state, schema version, and asset ownership.

## Pipeline

Source Asset
    ↓
Extraction
    ↓
Segmentation
    ↓
Classification
    ↓
Derivation Request
    ↓
Derivation Engine
    ↓
Derived Object Reference
    ↓
Validation
    ↓
Lineage Graph
    ↓
Knowledge Engine

## Responsibilities

- Accept validated derivation requests
- Produce durable derivative identifiers
- Create derived-object references
- Preserve source-segment lineage
- Preserve transformation lineage
- Preserve review state
- Preserve schema and record versions
- Validate requests and results
- Prepare normalized objects for the Knowledge Engine

## Current Scope

Implemented:

- Derivation contracts
- Deterministic derivation engine
- Request validation
- Result validation
- Identifier validation
- Lineage validation
- Schema validation
- Synthetic fixture
- Executable tests
- Module exports

Classification references are retained on the derivation request but are not yet stored directly on DerivedObjectReference.

Future phases will introduce richer derived-object payloads, direct classification lineage, persistence, approval workflows, knowledge-object construction, conflict detection, version supersession, and AI-assisted derivation.
