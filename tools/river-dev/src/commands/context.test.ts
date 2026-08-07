import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevDevelopmentContext
} from "../types";

import {
    formatContextReport
} from "./context";


function createContext():
RiverDevDevelopmentContext {

    return {

        version:
            "1.0.0",

        generatedAt:
            "2026-08-07T15:40:00.000Z",

        identity: {
            repositoryRoot:
                "C:/repo",
            branch:
                "dev-19-context-engine",
            commit:
                "1234567890123456789012345678901234567890",
            capturedAt:
                "2026-08-07T15:40:00.000Z",
            discoveryVersion:
                "1.0.0",
            specificationPath:
                ".river-dev/specifications/dev-19-context-engine.json"
        },

        project: {
            name:
                "The River Kept Flowing",
            repositoryType:
                "Astro static site",
            defaultBranch:
                "main",
            packageManager:
                "npm"
        },

        phase: {
            phase:
                "DEV-19 Context Engine",
            branch:
                "dev-19-context-engine",
            specificationPath:
                ".river-dev/specifications/dev-19-context-engine.json",
            objective:
                "Build deterministic context.",
            commitMessage:
                "DEV-19: Build deterministic development context engine"
        },

        repository: {
            repositoryRoot:
                "C:/repo",
            branch:
                "dev-19-context-engine",
            commit:
                "1234567890123456789012345678901234567890",
            clean:
                true,
            changedPaths:
                [],
            capturedAt:
                "2026-08-07T15:40:00.000Z"
        },

        discovery: {
            version:
                "1.0.0",
            repositoryRoot:
                "C:/repo",
            projectName:
                "The River Kept Flowing",
            branch:
                "dev-19-context-engine",
            commit:
                "1234567890123456789012345678901234567890",
            discoveredAt:
                "2026-08-07T15:40:00.000Z",
            entries:
                [],
            counts: {
                total:
                    0,
                files:
                    0,
                directories:
                    0,
                protected:
                    0
            },
            keyPaths: {
                developmentAgent:
                    "tools/river-dev",
                publicApplication:
                    "src"
            }
        },

        keyPaths: {
            developmentAgent:
                "tools/river-dev",
            publicApplication:
                "src"
        },

        architecturalContext: [
            "Repository discovery"
        ],

        scope: {
            modifiablePaths: [
                "tools/river-dev/src/types.ts"
            ],
            creatablePaths: [
                "tools/river-dev/src/core/context-engine.ts"
            ],
            excludedPaths: [
                ".env",
                ".git",
                "node_modules",
                "dist"
            ]
        },

        acceptanceCriteria: [
            "Context is deterministic."
        ],

        requiredTests: [
            "tools/river-dev/src/core/context-engine.test.ts"
        ],

        requiredQualityGates: [
            "tests",
            "typecheck"
        ],

        approvedCommands: [
            "git-status",
            "typecheck"
        ],

        repairLimits: {
            maximumAttempts:
                3,
            allowScopeExpansion:
                false
        },

        approvalBoundaries: [
            "push"
        ],

        session: {
            hasActiveSession:
                false,
            sessionId:
                null,
            compatible:
                true,
            reason:
                "No active River Dev session exists."
        },

        artifacts:
        {
            version:
                "1.0.0",

            maximumArtifactBytes:
                0,

            maximumTotalBytes:
                0,

            loadedBytes:
                0,

            loadedCount:
                0,

            truncatedCount:
                0,

            omittedCount:
                0,

            artifacts:
                []
        },
    relevantEntries: [
            {
                path:
                    "tools/river-dev/src/types.ts",
                kind:
                    "file",
                classification:
                    "river-dev",
                reason:
                    "approved-modifiable-scope"
            },
            {
                path:
                    "tools/river-dev/src/core/context-engine.ts",
                kind:
                    "file",
                classification:
                    "river-dev",
                reason:
                    "approved-creatable-scope"
            }
        ]

    };

}


test(
    "formats development context identity",
    () => {

        const output =
            formatContextReport(
                createContext()
            );

        assert.match(
            output,
            /River Development Context/
        );

        assert.match(
            output,
            /Phase: DEV-19 Context Engine/
        );

        assert.match(
            output,
            /Branch: dev-19-context-engine/
        );

        assert.match(
            output,
            /Repository: C:\/repo/
        );

        assert.match(
            output,
            /The River Kept Flowing/
        );

    }
);


test(
    "formats relevant repository entries",
    () => {

        const output =
            formatContextReport(
                createContext()
            );

        assert.match(
            output,
            /tools\/river-dev\/src\/types\.ts \(approved-modifiable-scope\)/
        );

        assert.match(
            output,
            /tools\/river-dev\/src\/core\/context-engine\.ts \(approved-creatable-scope\)/
        );

    }
);

