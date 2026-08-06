import type {
    RiverDevImplementationPlan
} from "./planner";


export type RiverDevImplementationIntentOperationType =
    "write-file";


export interface RiverDevWriteFileIntent {

    readonly type:
        "write-file";

    readonly path:
        string;

    readonly content:
        string;

    readonly overwrite:
        boolean;

    readonly reason:
        string;

}


export type RiverDevImplementationIntentOperation =
    RiverDevWriteFileIntent;


export interface RiverDevImplementationIntent {

    readonly version:
        "1.0.0";

    readonly intentId:
        string;

    readonly planId:
        string;

    readonly branch:
        string;

    readonly objective:
        string;

    readonly operations:
        readonly RiverDevImplementationIntentOperation[];

}


function assertNonEmpty(
    value:
        string,
    label:
        string
): void {

    if (
        value.trim().length ===
        0
    ) {
        throw new TypeError(
            `${label} cannot be empty.`
        );
    }

}


export function validateImplementationIntent(
    plan:
        RiverDevImplementationPlan,
    intent:
        RiverDevImplementationIntent
): void {

    assertNonEmpty(
        intent.intentId,
        "Implementation intent identifier"
    );

    assertNonEmpty(
        intent.planId,
        "Implementation intent plan identifier"
    );

    assertNonEmpty(
        intent.branch,
        "Implementation intent branch"
    );

    assertNonEmpty(
        intent.objective,
        "Implementation intent objective"
    );

    if (
        intent.planId !==
        plan.planId
    ) {
        throw new TypeError(
            "Implementation intent does not match the approved plan."
        );
    }

    if (
        intent.branch !==
        plan.branch
    ) {
        throw new TypeError(
            "Implementation intent branch does not match the approved plan."
        );
    }

    if (
        intent.operations.length ===
        0
    ) {
        throw new TypeError(
            "Implementation intent must contain at least one operation."
        );
    }

    const seenPaths =
        new Set<string>();

    for (
        const operation of
        intent.operations
    ) {

        assertNonEmpty(
            operation.path,
            "Implementation intent operation path"
        );

        assertNonEmpty(
            operation.reason,
            "Implementation intent operation reason"
        );

        if (
            !plan.allowedPaths.includes(
                operation.path
            )
        ) {
            throw new TypeError(
                `Implementation intent path is outside the approved plan scope: ${operation.path}`
            );
        }

        if (
            plan.excludedPaths.includes(
                operation.path
            )
        ) {
            throw new TypeError(
                `Implementation intent path is excluded by the approved plan: ${operation.path}`
            );
        }

        if (
            seenPaths.has(
                operation.path
            )
        ) {
            throw new TypeError(
                `Duplicate implementation intent path: ${operation.path}`
            );
        }

        seenPaths.add(
            operation.path
        );

    }

}
