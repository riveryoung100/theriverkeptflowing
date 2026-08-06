import type {
    RiverDevImplementationManifest
} from "../execution/runner";

import type {
    RiverDevImplementationIntent
} from "./implementation-intent";

import type {
    RiverDevImplementationPlan
} from "./planner";

import {
    generateImplementationManifest
} from "./manifest-generator";

import {
    generateImplementationProposal
} from "./proposal-generator";

import type {
    RiverDevImplementationProposal
} from "./implementation-proposal";


export type RiverDevArtifactPipelineOutcome =
    | "proposal-generated"
    | "manifest-generated"
    | "approval-required";


export interface RiverDevArtifactPipelineRequest {

    readonly plan:
        RiverDevImplementationPlan;

    readonly intent:
        RiverDevImplementationIntent;

    readonly approveProposal:
        boolean;

}


export interface RiverDevArtifactPipelineResult {

    readonly outcome:
        RiverDevArtifactPipelineOutcome;

    readonly proposal:
        RiverDevImplementationProposal;

    readonly manifest:
        RiverDevImplementationManifest |
        null;

    readonly proposalApproved:
        boolean;

    readonly repositoryWritesPerformed:
        false;

}


export function runArtifactPipeline(
    request:
        RiverDevArtifactPipelineRequest
): RiverDevArtifactPipelineResult {

    const proposalResult =
        generateImplementationProposal(
            request.plan,
            request.intent
        );

    const generatedProposal =
        proposalResult.proposal;

    if (
        request.approveProposal !==
        true
    ) {
        return {

            outcome:
                "approval-required",

            proposal:
                generatedProposal,

            manifest:
                null,

            proposalApproved:
                false,

            repositoryWritesPerformed:
                false

        };
    }

    const approvedProposal:
        RiverDevImplementationProposal =
        {
            ...generatedProposal,

            approved:
                true
        };

    const manifestResult =
        generateImplementationManifest(
            request.plan,
            approvedProposal
        );

    return {

        outcome:
            "manifest-generated",

        proposal:
            approvedProposal,

        manifest:
            manifestResult.manifest,

        proposalApproved:
            true,

        repositoryWritesPerformed:
            false

    };

}
