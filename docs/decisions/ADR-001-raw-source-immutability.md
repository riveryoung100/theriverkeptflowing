# ADR-001: Raw Source Immutability

## Status

Accepted

## Context

The Assimilation Engine receives source material from many origins including video, audio, documents, notes, webpages, emails, transcripts, and future connectors.

Those original assets represent the authoritative source of truth.

Any extraction, normalization, summarization, segmentation, classification, or publication is derived from those original assets.

If original assets are modified after ingestion, provenance can no longer be trusted and downstream knowledge cannot be reproduced.

## Decision

Raw source assets are immutable.

After ingestion:

- Original bytes are never modified.
- Derived records are stored separately.
- Every derived record references its originating source.
- Corrections create new derived records instead of editing original assets.
- Provenance must always remain traceable.

## Consequences

Benefits:

- Complete audit trail
- Reproducible processing
- Reliable provenance
- Version history
- Safer AI processing
- Future reprocessing from original assets

Trade-offs:

- Additional storage
- More lineage metadata
- Explicit version management

These costs are acceptable because provenance is a foundational architectural requirement for The River Kept Flowing.
