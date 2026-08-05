# Workflow Step Handlers

## Status

Phase 28B introduces executable workflow step handlers for the River Orchestration Engine.

## Purpose

Phase 28A established deterministic workflow ordering.

Phase 28B allows each workflow step to dispatch through a registered executable handler.

## Pipeline

Workflow Definition
    ↓
Dependency Resolution
    ↓
Handler Registry
    ↓
Handler Context
    ↓
Handler Execution
    ↓
Validated Outputs
    ↓
Workflow Step Execution Record

## Handler Context

Each handler receives:

- Workflow run identifier
- Workflow step definition
- Workflow context
- Dependency outputs
- Deterministic execution timestamp

## Handler Result

Each handler returns:

- Step status
- Outputs
- Warnings
- Optional failure information

## Registry Responsibilities

The registry:

- Registers one handler per workflow step type
- Rejects duplicate registrations
- Rejects missing-handler lookups
- Produces deterministic handler listings

## Current Scope

The initial engine includes deterministic default handlers.

Future phases replace these defaults with real subsystem adapters for:

- Assimilation
- Knowledge graph construction
- Knowledge querying
- Knowledge reasoning
- Insight generation
- Human review
- Notifications
- Custom workflows
