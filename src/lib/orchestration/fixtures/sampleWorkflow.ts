import {
    createWorkflowId,
    createWorkflowRunId,
    createWorkflowStepId
} from "../identifiers";

import {
    ORCHESTRATION_SCHEMA_VERSION
} from "../types";

import type {
    WorkflowDefinition,
    WorkflowEngineResult,
    WorkflowRun,
    WorkflowRunRequest,
    WorkflowStepDefinition
} from "../types";


const assimilationStepId =
    createWorkflowStepId();

const knowledgeBuildStepId =
    createWorkflowStepId();

const knowledgeQueryStepId =
    createWorkflowStepId();

const reasoningStepId =
    createWorkflowStepId();

const insightStepId =
    createWorkflowStepId();


export const sampleAssimilationStep:
WorkflowStepDefinition = {

    id:
        assimilationStepId,

    name:
        "Assimilate source material",

    type:
        "assimilation",

    dependsOn:
        [],

    inputs: [
        {
            key:
                "sourceAssetId",

            value:
                "asset:sample"
        }
    ],

    failurePolicy:
        "stop",

    requiresReview:
        false

};


export const sampleKnowledgeBuildStep:
WorkflowStepDefinition = {

    id:
        knowledgeBuildStepId,

    name:
        "Build knowledge graph",

    type:
        "knowledge-build",

    dependsOn: [
        assimilationStepId
    ],

    inputs:
        [],

    failurePolicy:
        "block-dependents",

    requiresReview:
        false

};


export const sampleKnowledgeQueryStep:
WorkflowStepDefinition = {

    id:
        knowledgeQueryStepId,

    name:
        "Query knowledge graph",

    type:
        "knowledge-query",

    dependsOn: [
        knowledgeBuildStepId
    ],

    inputs:
        [],

    failurePolicy:
        "block-dependents",

    requiresReview:
        false

};


export const sampleReasoningStep:
WorkflowStepDefinition = {

    id:
        reasoningStepId,

    name:
        "Reason over knowledge",

    type:
        "knowledge-reasoning",

    dependsOn: [
        knowledgeQueryStepId
    ],

    inputs:
        [],

    failurePolicy:
        "block-dependents",

    requiresReview:
        false

};


export const sampleInsightStep:
WorkflowStepDefinition = {

    id:
        insightStepId,

    name:
        "Create knowledge insight",

    type:
        "knowledge-insight",

    dependsOn: [
        reasoningStepId
    ],

    inputs:
        [],

    failurePolicy:
        "stop",

    requiresReview:
        true

};


export const sampleWorkflow:
WorkflowDefinition = {

    id:
        createWorkflowId(),

    name:
        "River Knowledge Pipeline",

    description:
        "Assimilates source material and produces a reviewable knowledge insight.",

    status:
        "ready",

    steps: [
        sampleAssimilationStep,
        sampleKnowledgeBuildStep,
        sampleKnowledgeQueryStep,
        sampleReasoningStep,
        sampleInsightStep
    ],

    createdAt:
        "2026-08-05T20:50:00.000Z",

    version:
        1,

    schemaVersion:
        ORCHESTRATION_SCHEMA_VERSION

};


export const sampleWorkflowRunRequest:
WorkflowRunRequest = {

    workflow:
        sampleWorkflow,

    requestedAt:
        "2026-08-05T20:51:00.000Z",

    context: {
        source:
            "sample-fixture"
    }

};


export const sampleWorkflowRun:
WorkflowRun = {

    id:
        createWorkflowRunId(),

    workflowId:
        sampleWorkflow.id,

    status:
        "completed",

    requestedAt:
        sampleWorkflowRunRequest.requestedAt,

    startedAt:
        sampleWorkflowRunRequest.requestedAt,

    completedAt:
        sampleWorkflowRunRequest.requestedAt,

    steps:
        sampleWorkflow.steps.map(
            (step) => {
                return {

                    stepId:
                        step.id,

                    status:
                        "completed",

                    startedAt:
                        sampleWorkflowRunRequest.requestedAt,

                    completedAt:
                        sampleWorkflowRunRequest.requestedAt,

                    outputs:
                        []

                };
            }
        ),

    warnings:
        [],

    schemaVersion:
        ORCHESTRATION_SCHEMA_VERSION

};


export const sampleWorkflowEngineResult:
WorkflowEngineResult = {

    run:
        sampleWorkflowRun

};
