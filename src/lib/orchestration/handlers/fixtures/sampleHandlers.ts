import type {
    WorkflowStepType
} from "../../types";

import type {
    WorkflowStepHandler,
    WorkflowStepHandlerContext,
    WorkflowStepHandlerResult
} from "../types";


export class DeterministicSampleHandler
implements WorkflowStepHandler {

    constructor(
        public readonly type:
            WorkflowStepType
    ) {}


    execute(
        context: WorkflowStepHandlerContext
    ): WorkflowStepHandlerResult {

        return {

            status:
                "completed",

            outputs: [
                {
                    key:
                        "handlerType",

                    value:
                        this.type
                },
                {
                    key:
                        "stepId",

                    value:
                        context.step.id
                },
                {
                    key:
                        "executedAt",

                    value:
                        context.timestamp
                }
            ],

            warnings:
                []

        };

    }

}


export function createSampleHandler(
    type: WorkflowStepType
): WorkflowStepHandler {

    return new
        DeterministicSampleHandler(
            type
        );

}


export const sampleAssimilationHandler =
    createSampleHandler(
        "assimilation"
    );


export const sampleKnowledgeBuildHandler =
    createSampleHandler(
        "knowledge-build"
    );


export const sampleKnowledgeQueryHandler =
    createSampleHandler(
        "knowledge-query"
    );


export const sampleKnowledgeReasoningHandler =
    createSampleHandler(
        "knowledge-reasoning"
    );


export const sampleKnowledgeInsightHandler =
    createSampleHandler(
        "knowledge-insight"
    );


export const sampleReviewHandler =
    createSampleHandler(
        "review"
    );


export const sampleNotificationHandler =
    createSampleHandler(
        "notification"
    );


export const sampleCustomHandler =
    createSampleHandler(
        "custom"
    );


export const sampleHandlers:
readonly WorkflowStepHandler[] = [

    sampleAssimilationHandler,
    sampleKnowledgeBuildHandler,
    sampleKnowledgeQueryHandler,
    sampleKnowledgeReasoningHandler,
    sampleKnowledgeInsightHandler,
    sampleReviewHandler,
    sampleNotificationHandler,
    sampleCustomHandler

];
