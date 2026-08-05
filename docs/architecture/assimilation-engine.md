# Assimilation Engine Architecture

## Status

Phase 26A establishes the core contracts, identifiers, validation rules, lifecycle states, synthetic fixtures, and executable tests for the Assimilation Engine.

The Assimilation Engine sits upstream of the Knowledge Engine and Intelligence Engine.

## Architecture

Source Assets
    ↓
Asset Intake
    ↓
Assimilation Engine
    ↓
Normalized Knowledge
    ↓
Knowledge Engine
    ↓
Intelligence Engine

## Purpose

The Assimilation Engine provides a governed entry point for every asset entering The River Kept Flowing.

Its responsibilities are:

- Preserve original assets
- Record provenance
- Generate stable identifiers
- Validate records
- Normalize extracted information
- Pass normalized knowledge downstream

Phase 26A establishes contracts only. It does not implement storage, uploads, AI providers, databases, or publishing.

## Current Scope

Implemented:

- Type contracts
- Stable identifiers
- Validation
- Lifecycle states
- Synthetic fixtures
- Executable tests

Future phases will add ingestion, provenance tracking, extraction pipelines, persistence, and publishing.
