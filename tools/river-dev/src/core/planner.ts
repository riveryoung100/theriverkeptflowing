import {
    createHash
} from "node:crypto";

import {
    readFile
} from "node:fs/promises";

import type {
    RiverDevApprovalRequirement,
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";


export const RIVER_DEV_PLAN_VERSION =
    "1.0.0" as const;


export interface RiverDevPhaseSpecification {

    readonly version:
        string;

    readonly phase:
        string;

    readonly branch:
        string;

    readonly commitMessage:
        string;

    readonly objective:
        string;

    readonly architecturalContext:
        readonly string[];

    readonly approvedScope: {

        readonly modifiablePaths:
            readonly string[];

        readonly creatablePaths:
            readonly string[];

        readonly excludedPaths:
            readonly string[];

    };

    readonly acceptanceCriteria:
        readonly string[];

    readonly requiredTests:
        readonly string[];

    readonly requiredQualityGates:
        readonly string[];

    readonly approvedCommands:
        readonly string[];

    readonly repairLimits: {

        readonly maximumAttempts:
            number;

        readonly allowScopeExpansion:
            boolean;

    };

    readonly approvalBoundaries:
        readonly RiverDevApprovalRequirement[];

}


export interface RiverDevPlanStep {

    readonly order:
        number;

    readonly type:
        | "inspect"
        | "validate-scope"
        | "implement"
        | "test"
        | "typecheck"
        | "review"
        | "stage"
        | "commit";

    readonly description:
        string;

}


export interface RiverDevImplementationPlan {

    readonly version:
        typeof RIVER_DEV_PLAN_VERSION;

    readonly planId:
        string;

    readonly phase:
        string;

    readonly branch:
        string;

    readonly commitMessage:
        string;

    readonly objective:
        string;

    readonly generatedAt:
        string;

    readonly allowedPaths:
        readonly string[];

    readonly excludedPaths:
        readonly string[];

    readonly acceptanceCriteria:
        readonly string[];

    readonly requiredTests:
        readonly string[];

    readonly requiredQualityGates:
        readonly string[];

    readonly approvedCommands:
        readonly string[];

    readonly maximumRepairAttempts:
        number;

    readonly scopeExpansionAllowed:
        boolean;

    readonly approvalBoundaries:
        readonly RiverDevApprovalRequirement[];

    readonly steps:
        readonly RiverDevPlanStep[];

}


function removeUtf8Bom(
    source: string
): string {

    if (
        source.charCodeAt(
            0
        ) ===
        0xfeff
    ) {
        return source.slice(
            1
        );
    }

    return source;

}


function assertNonEmptyString(
    value: string,
    label: string
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


function assertNonEmptyArray(
    values: readonly unknown[],
    label: string
): void {

    if (
        values.length ===
        0
    ) {
        throw new TypeError(
            `${label} must contain at least one item.`
        );
    }

}


function assertUniqueStrings(
    values: readonly string[],
    label: string
): void {

    if (
        new Set(
            values
        ).size !==
        values.length
    ) {
        throw new TypeError(
            `${label} must contain unique values.`
        );
    }

}


export function validatePhaseSpecification(
    configuration:
        RiverDevConfiguration,
    specification:
        RiverDevPhaseSpecification
): void {

    assertNonEmptyString(
        specification.phase,
        "Phase"
    );

    assertNonEmptyString(
        specification.branch,
        "Branch"
    );

    assertNonEmptyString(
        specification.commitMessage,
        "Commit message"
    );

    assertNonEmptyString(
        specification.objective,
        "Objective"
    );

    assertNonEmptyArray(
        specification.acceptanceCriteria,
        "Acceptance criteria"
    );

    assertNonEmptyArray(
        specification.requiredTests,
        "Required tests"
    );

    assertNonEmptyArray(
        specification.requiredQualityGates,
        "Required quality gates"
    );

    assertUniqueStrings(
        specification.approvedScope
            .modifiablePaths,
        "Modifiable paths"
    );

    assertUniqueStrings(
        specification.approvedScope
            .creatablePaths,
        "Creatable paths"
    );

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const allowedPaths = [
        ...specification
            .approvedScope
            .modifiablePaths,
        ...specification
            .approvedScope
            .creatablePaths
    ];

    for (
        const path of
        allowedPaths
    ) {

        policy.assertRepositoryPath(
            path
        );

        policy.assertPathIsNotProtected(
            path
        );

    }

    for (
        const commandName of
        specification.approvedCommands
    ) {

        const commandExists =
            configuration
                .commandPolicy
                .allowedCommands
                .some(
                    (command) => {
                        return (
                            command.name ===
                            commandName
                        );
                    }
                );

        if (
            !commandExists
        ) {
            throw new TypeError(
                `Unknown approved command: ${commandName}`
            );
        }

    }

    const configuredGateIds =
        new Set(
            configuration
                .qualityGates
                .requiredBeforeCommit
                .map(
                    (gate) => {
                        return gate.id;
                    }
                )
        );

    for (
        const gateId of
        specification
            .requiredQualityGates
    ) {

        if (
            !configuredGateIds.has(
                gateId
            )
        ) {
            throw new TypeError(
                `Unknown quality gate: ${gateId}`
            );
        }

    }

    if (
        specification
            .repairLimits
            .maximumAttempts >
        configuration
            .safetyPolicy
            .repairs
            .maximumAttempts
    ) {
        throw new TypeError(
            "Specification exceeds the configured repair-attempt limit."
        );
    }

    if (
        specification
            .repairLimits
            .allowScopeExpansion
    ) {
        throw new TypeError(
            "Planning specifications may not enable scope expansion."
        );
    }

}


export async function loadPhaseSpecification(
    path: string
): Promise<RiverDevPhaseSpecification> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevPhaseSpecification;

}


function createPlanIdentifier(
    specification:
        RiverDevPhaseSpecification,
    generatedAt:
        string
): string {

    const source =
        JSON.stringify({

            version:
                specification.version,

            phase:
                specification.phase,

            branch:
                specification.branch,

            objective:
                specification.objective,

            scope:
                specification.approvedScope,

            acceptanceCriteria:
                specification.acceptanceCriteria,

            generatedAt

        });

    const digest =
        createHash(
            "sha256"
        )
            .update(
                source
            )
            .digest(
                "hex"
            )
            .slice(
                0,
                24
            );

    return `plan:${digest}`;

}


function createPlanSteps(
    specification:
        RiverDevPhaseSpecification
): readonly RiverDevPlanStep[] {

    return [
        {
            order:
                1,

            type:
                "inspect",

            description:
                "Inspect the repository branch, commit, and working-tree state."
        },
        {
            order:
                2,

            type:
                "validate-scope",

            description:
                "Validate every proposed path and command against River Dev policy."
        },
        {
            order:
                3,

            type:
                "implement",

            description:
                `Implement the approved objective within ${specification.approvedScope.modifiablePaths.length + specification.approvedScope.creatablePaths.length} allowed paths.`
        },
        {
            order:
                4,

            type:
                "test",

            description:
                `Run ${specification.requiredTests.length} required test targets.`
        },
        {
            order:
                5,

            type:
                "typecheck",

            description:
                "Run River Dev and main-project typechecking."
        },
        {
            order:
                6,

            type:
                "review",

            description:
                "Review the final diff against scope, safety, documentation, exports, and acceptance criteria."
        },
        {
            order:
                7,

            type:
                "stage",

            description:
                "Stage only files explicitly permitted by the approved plan."
        },
        {
            order:
                8,

            type:
                "commit",

            description:
                `Create the local commit: ${specification.commitMessage}`
        }
    ];

}


export function createImplementationPlan(
    configuration:
        RiverDevConfiguration,
    specification:
        RiverDevPhaseSpecification,
    generatedAt:
        string = new Date()
            .toISOString()
): RiverDevImplementationPlan {

    validatePhaseSpecification(
        configuration,
        specification
    );

    const allowedPaths = [
        ...specification
            .approvedScope
            .modifiablePaths,
        ...specification
            .approvedScope
            .creatablePaths
    ]
        .sort();

    return {

        version:
            RIVER_DEV_PLAN_VERSION,

        planId:
            createPlanIdentifier(
                specification,
                generatedAt
            ),

        phase:
            specification.phase,

        branch:
            specification.branch,

        commitMessage:
            specification.commitMessage,

        objective:
            specification.objective,

        generatedAt,

        allowedPaths,

        excludedPaths:
            [
                ...specification
                    .approvedScope
                    .excludedPaths
            ]
                .sort(),

        acceptanceCriteria:
            specification.acceptanceCriteria,

        requiredTests:
            specification.requiredTests,

        requiredQualityGates:
            specification.requiredQualityGates,

        approvedCommands:
            specification.approvedCommands,

        maximumRepairAttempts:
            specification
                .repairLimits
                .maximumAttempts,

        scopeExpansionAllowed:
            specification
                .repairLimits
                .allowScopeExpansion,

        approvalBoundaries:
            specification
                .approvalBoundaries,

        steps:
            createPlanSteps(
                specification
            )

    };

}
