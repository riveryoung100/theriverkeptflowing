import type {
    RiverDevImplementationProposal
} from "./implementation-proposal";

import type {
    RiverDevImplementationPlan
} from "./planner";

import {
    validateImplementationIntent
} from "./implementation-intent";

import type {
    RiverDevImplementationIntent
} from "./implementation-intent";


export interface RiverDevProposalGenerationResult {

    readonly proposal:
        RiverDevImplementationProposal;

    readonly operationCount:
        number;

}


function createProposalIdentifier(
    intent:
        RiverDevImplementationIntent
): string {

    return `proposal:${intent.intentId}`;

}


export function generateImplementationProposal(
    plan:
        RiverDevImplementationPlan,
    intent:
        RiverDevImplementationIntent
): RiverDevProposalGenerationResult {

    validateImplementationIntent(
        plan,
        intent
    );

    const operations =
        intent.operations
            .map(
                (operation) => {

                    return {

                        type:
                            operation.type,

                        path:
                            operation.path,

                        content:
                            operation.content,

                        overwrite:
                            operation.overwrite,

                        reason:
                            operation.reason

                    };

                }
            )
            .sort(
                (
                    first,
                    second
                ) => {
                    return first.path.localeCompare(
                        second.path
                    );
                }
            );

    const proposal:
        RiverDevImplementationProposal =
        {

            version:
                "1.0.0",

            proposalId:
                createProposalIdentifier(
                    intent
                ),

            planId:
                plan.planId,

            branch:
                plan.branch,

            objective:
                intent.objective,

            approved:
                false,

            operations

        };

    return {

        proposal,

        operationCount:
            proposal.operations.length

    };

}
