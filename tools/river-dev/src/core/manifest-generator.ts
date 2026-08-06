import type {
    RiverDevImplementationManifest
} from "../execution/runner";

import type {
    RiverDevImplementationPlan
} from "./planner";

import {
    validateImplementationProposal
} from "./implementation-proposal";

import type {
    RiverDevImplementationProposal
} from "./implementation-proposal";


export interface RiverDevManifestGenerationResult {

    readonly manifest:
        RiverDevImplementationManifest;

    readonly operationCount:
        number;

}


function createImplementationIdentifier(
    proposal:
        RiverDevImplementationProposal
): string {

    return `implementation:${proposal.proposalId}`;

}


export function generateImplementationManifest(
    plan:
        RiverDevImplementationPlan,
    proposal:
        RiverDevImplementationProposal
): RiverDevManifestGenerationResult {

    validateImplementationProposal(
        plan,
        proposal
    );

    const operations =
        proposal.operations
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
                            operation.overwrite

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

    const manifest:
        RiverDevImplementationManifest =
        {

            version:
                "1.0.0",

            implementationId:
                createImplementationIdentifier(
                    proposal
                ),

            planId:
                plan.planId,

            branch:
                plan.branch,

            description:
                proposal.objective,

            operations

        };

    return {

        manifest,

        operationCount:
            manifest.operations.length

    };

}
