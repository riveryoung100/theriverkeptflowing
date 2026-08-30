import type {
    RiverDevDevelopmentContext,
    RiverDevPlanningDecision
} from "../types";

import type {
    RiverDevImplementationPlan
} from "./planner";

import {
    validateImplementationIntent
} from "./implementation-intent";

import type {
    RiverDevImplementationIntent
} from "./implementation-intent";


export interface RiverDevImplementationContentGenerationRequest {

    readonly plan:
        RiverDevImplementationPlan;

    readonly context:
        RiverDevDevelopmentContext;

    readonly decision:
        RiverDevPlanningDecision;

}


export interface RiverDevGeneratedImplementationContent {

    readonly content:
        string;

    readonly overwrite:
        boolean;

    readonly reason?:
        string;

}


export type RiverDevImplementationContentGenerationProvider =
    (
        request:
            RiverDevImplementationContentGenerationRequest
    ) =>
        Promise<RiverDevGeneratedImplementationContent>;


export interface RiverDevImplementationIntentGenerationResult {

    readonly intent:
        RiverDevImplementationIntent;

    readonly operationCount:
        number;

    readonly repositoryWritesPerformed:
        false;

}


function createIntentIdentifier(
    plan:
        RiverDevImplementationPlan
): string {

    if (
        plan.planId.startsWith(
            "plan:"
        )
    ) {
        return `intent:${plan.planId.slice(5)}`;
    }

    return `intent:${plan.planId}`;

}


function getGenerationDecisions(
    plan:
        RiverDevImplementationPlan
): readonly RiverDevPlanningDecision[] {

    const intelligence =
        plan.planningIntelligence;

    if (
        intelligence === undefined ||
        intelligence.decisions.length === 0
    ) {
        throw new TypeError(
            "Architecture-grounded planning intelligence is required for implementation intent generation."
        );
    }

    return [...intelligence.decisions]
        .sort(
            (left, right) => {

                if (
                    left.priority !==
                    right.priority
                ) {
                    return right.priority -
                        left.priority;
                }

                return left.path.localeCompare(
                    right.path
                );

            }
        );

}


export async function generateImplementationIntent(
    plan:
        RiverDevImplementationPlan,
    context:
        RiverDevDevelopmentContext,
    provider:
        RiverDevImplementationContentGenerationProvider
): Promise<RiverDevImplementationIntentGenerationResult> {

    const allowedPathSet =
        new Set(
            plan.allowedPaths
        );

    const excludedPathSet =
        new Set(
            plan.excludedPaths
        );

    const decisions =
        getGenerationDecisions(
            plan
        );

    const seenPaths =
        new Set<string>();

    const operations:
        RiverDevImplementationIntent["operations"][number][] =
        [];

    for (const decision of decisions) {

        if (
            decision.action !== "create" &&
            decision.action !== "modify"
        ) {
            throw new TypeError(
                `Unsupported implementation generation action for ${decision.path}: ${decision.action}`
            );
        }

        if (
            !allowedPathSet.has(
                decision.path
            )
        ) {
            throw new TypeError(
                `Implementation generation path is outside the approved plan scope: ${decision.path}`
            );
        }

        if (
            excludedPathSet.has(
                decision.path
            )
        ) {
            throw new TypeError(
                `Implementation generation path is excluded by the approved plan: ${decision.path}`
            );
        }

        if (
            seenPaths.has(
                decision.path
            )
        ) {
            throw new TypeError(
                `Duplicate implementation generation path: ${decision.path}`
            );
        }

        seenPaths.add(
            decision.path
        );

        const generated =
            await provider({
                plan,
                context,
                decision
            });

        const requiredOverwrite =
            decision.action ===
                "modify";

        if (
            generated.overwrite !==
            requiredOverwrite
        ) {
            throw new TypeError(
                `Generated overwrite semantics do not match planned action for ${decision.path}.`
            );
        }

        operations.push({
            type:
                "write-file",
            path:
                decision.path,
            content:
                generated.content,
            overwrite:
                generated.overwrite,
            reason:
                generated.reason ??
                decision.reason
        });

    }

    const intent:
        RiverDevImplementationIntent =
        {
            version:
                "1.0.0",
            intentId:
                createIntentIdentifier(
                    plan
                ),
            planId:
                plan.planId,
            branch:
                plan.branch,
            objective:
                plan.objective,
            operations
        };

    validateImplementationIntent(
        plan,
        intent
    );

    return {
        intent,
        operationCount:
            intent.operations.length,
        repositoryWritesPerformed:
            false
    };

}
