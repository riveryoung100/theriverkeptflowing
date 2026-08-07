import {
    relative
} from "node:path";

import type {
    RiverDevConfiguration,
    RiverDevContextRelevantEntry,
    RiverDevContextSessionCompatibility,
    RiverDevDevelopmentContext,
    RiverDevRepositoryDiscoveryEntry,
    RiverDevRepositorySnapshot
} from "../types";

import {
    captureRepositorySnapshot
} from "../git/repository";

import {
    createRiverDevStateStore
} from "../state/store";

import {
    evaluateRiverDevSessionResume
} from "./session-state";

import {
    resolvePhaseSpecification
} from "./phase-resolution";

import {
    loadPhaseSpecification
} from "./planner";

import {
    discoverRepository
} from "./repository-discovery";


export const RIVER_DEV_CONTEXT_VERSION =
    "1.0.0" as const;

export const RIVER_DEV_MAX_RELEVANT_CONTEXT_ENTRIES =
    200 as const;


function normalizeRepositoryPath(
    value: string
): string {

    return value
        .replaceAll(
            "\\",
            "/"
        )
        .replace(
            /^\.\/+/,
            ""
        )
        .replace(
            /\/+/g,
            "/"
        );

}


function toRepositoryRelativePath(
    repositoryRoot: string,
    path: string
): string {

    return normalizeRepositoryPath(
        relative(
            repositoryRoot,
            path
        )
    );

}


function pathMatchesScope(
    entryPath: string,
    scopePath: string
): boolean {

    const entry =
        normalizeRepositoryPath(
            entryPath
        );

    const scope =
        normalizeRepositoryPath(
            scopePath
        );

    return (
        entry === scope ||
        entry.startsWith(
            `${scope}/`
        ) ||
        scope.startsWith(
            `${entry}/`
        )
    );

}


function createRelevantEntry(
    entry:
        RiverDevRepositoryDiscoveryEntry,
    reason:
        string
): RiverDevContextRelevantEntry {

    return {
        path:
            entry.path,
        kind:
            entry.kind,
        classification:
            entry.classification,
        reason
    };

}


function getRelevantEntryReason(
    entry:
        RiverDevRepositoryDiscoveryEntry,
    modifiablePaths:
        readonly string[],
    creatablePaths:
        readonly string[],
    requiredTests:
        readonly string[],
    keyPaths:
        Readonly<Record<string, string>>
): string | null {

    if (
        entry.protected ||
        entry.classification ===
            "protected"
    ) {
        return null;
    }

    if (
        modifiablePaths.some(
            (path) => {
                return pathMatchesScope(
                    entry.path,
                    path
                );
            }
        )
    ) {
        return "approved-modifiable-scope";
    }

    if (
        creatablePaths.some(
            (path) => {
                return pathMatchesScope(
                    entry.path,
                    path
                );
            }
        )
    ) {
        return "approved-creatable-scope";
    }

    if (
        requiredTests.some(
            (path) => {
                return pathMatchesScope(
                    entry.path,
                    path
                );
            }
        )
    ) {
        return "required-test";
    }

    if (
        Object.values(
            keyPaths
        )
            .some(
                (path) => {
                    return pathMatchesScope(
                        entry.path,
                        path
                    );
                }
            )
    ) {
        return "configured-key-path";
    }

    if (
        entry.classification ===
            "river-dev"
    ) {
        return "river-dev-system";
    }

    if (
        entry.classification ===
            "configuration"
    ) {
        return "project-configuration";
    }

    return null;

}


function selectRelevantEntries(
    entries:
        readonly RiverDevRepositoryDiscoveryEntry[],
    modifiablePaths:
        readonly string[],
    creatablePaths:
        readonly string[],
    requiredTests:
        readonly string[],
    keyPaths:
        Readonly<Record<string, string>>
): readonly RiverDevContextRelevantEntry[] {

    const ranked =
        entries
            .map(
                (entry) => {

                    const reason =
                        getRelevantEntryReason(
                            entry,
                            modifiablePaths,
                            creatablePaths,
                            requiredTests,
                            keyPaths
                        );

                    if (
                        reason ===
                        null
                    ) {
                        return null;
                    }

                    return createRelevantEntry(
                        entry,
                        reason
                    );

                }
            )
            .filter(
                (
                    entry
                ): entry is RiverDevContextRelevantEntry => {
                    return entry !==
                        null;
                }
            )
            .sort(
                (left, right) => {

                    const priority:
                        Readonly<Record<string, number>> = {
                            "approved-modifiable-scope":
                                0,
                            "approved-creatable-scope":
                                1,
                            "required-test":
                                2,
                            "configured-key-path":
                                3,
                            "river-dev-system":
                                4,
                            "project-configuration":
                                5
                        };

                    const leftPriority =
                        priority[
                            left.reason
                        ] ??
                        99;

                    const rightPriority =
                        priority[
                            right.reason
                        ] ??
                        99;

                    if (
                        leftPriority !==
                        rightPriority
                    ) {
                        return leftPriority -
                            rightPriority;
                    }

                    return left.path.localeCompare(
                        right.path
                    );

                }
            );

    return ranked.slice(
        0,
        RIVER_DEV_MAX_RELEVANT_CONTEXT_ENTRIES
    );

}


function evaluateSessionCompatibility(
    activeSession:
        Awaited<
            ReturnType<
                ReturnType<
                    typeof createRiverDevStateStore
                >["load"]
            >
        >["activeSession"],
    repository:
        RiverDevRepositorySnapshot
): RiverDevContextSessionCompatibility {

    if (
        activeSession ===
        null
    ) {

        return {
            hasActiveSession:
                false,
            sessionId:
                null,
            compatible:
                true,
            reason:
                "No active River Dev session exists."
        };

    }

    const evaluation =
        evaluateRiverDevSessionResume(
            activeSession,
            repository
        );

    return {
        hasActiveSession:
            true,
        sessionId:
            activeSession.sessionId,
        compatible:
            evaluation.resumable,
        reason:
            evaluation.reason
    };

}


export async function createRiverDevDevelopmentContext(
    configuration:
        RiverDevConfiguration,
    generatedAt:
        string = new Date()
            .toISOString()
): Promise<RiverDevDevelopmentContext> {

    const specificationPath =
        await resolvePhaseSpecification(
            configuration
        );

    const specification =
        await loadPhaseSpecification(
            specificationPath
        );

    const repository =
        await captureRepositorySnapshot(
            configuration.repositoryRoot,
            generatedAt
        );

    if (
        repository.branch !==
        specification.branch
    ) {
        throw new TypeError(
            `Context branch mismatch. Repository is "${repository.branch}" but specification expects "${specification.branch}".`
        );
    }

    const discovery =
        await discoverRepository(
            configuration,
            generatedAt
        );

    if (
        discovery.branch !==
            repository.branch ||
        discovery.commit !==
            repository.commit
    ) {
        throw new TypeError(
            "Repository discovery identity does not match the current repository snapshot."
        );
    }

    const stateStore =
        createRiverDevStateStore(
            configuration.repositoryRoot
        );

    const storedState =
        await stateStore.load();

    const session =
        evaluateSessionCompatibility(
            storedState.activeSession,
            repository
        );

    const specificationRelativePath =
        toRepositoryRelativePath(
            configuration.repositoryRoot,
            specificationPath
        );

    const relevantEntries =
        selectRelevantEntries(
            discovery.entries,
            specification.approvedScope
                .modifiablePaths,
            specification.approvedScope
                .creatablePaths,
            specification.requiredTests,
            discovery.keyPaths
        );

    return {

        version:
            RIVER_DEV_CONTEXT_VERSION,

        generatedAt,

        identity: {
            repositoryRoot:
                repository.repositoryRoot,
            branch:
                repository.branch,
            commit:
                repository.commit,
            capturedAt:
                repository.capturedAt,
            discoveryVersion:
                discovery.version,
            specificationPath:
                specificationRelativePath
        },

        project: {
            name:
                configuration.projectMap
                    .project
                    .name,
            repositoryType:
                configuration.projectMap
                    .project
                    .repositoryType,
            defaultBranch:
                configuration.projectMap
                    .project
                    .defaultBranch,
            packageManager:
                configuration.projectMap
                    .project
                    .packageManager
        },

        phase: {
            phase:
                specification.phase,
            branch:
                specification.branch,
            specificationPath:
                specificationRelativePath,
            objective:
                specification.objective,
            commitMessage:
                specification.commitMessage
        },

        repository,

        discovery,

        keyPaths:
            discovery.keyPaths,

        architecturalContext: [
            ...specification.architecturalContext
        ],

        scope: {
            modifiablePaths: [
                ...specification.approvedScope
                    .modifiablePaths
            ],
            creatablePaths: [
                ...specification.approvedScope
                    .creatablePaths
            ],
            excludedPaths: [
                ...specification.approvedScope
                    .excludedPaths
            ]
        },

        acceptanceCriteria: [
            ...specification.acceptanceCriteria
        ],

        requiredTests: [
            ...specification.requiredTests
        ],

        requiredQualityGates: [
            ...specification.requiredQualityGates
        ],

        approvedCommands: [
            ...specification.approvedCommands
        ],

        repairLimits: {
            maximumAttempts:
                specification.repairLimits
                    .maximumAttempts,
            allowScopeExpansion:
                specification.repairLimits
                    .allowScopeExpansion
        },

        approvalBoundaries: [
            ...specification.approvalBoundaries
        ],

        session,

        relevantEntries

    };

}
