import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundationInput,
    RiverDevExecutionIntelligenceGovernanceOrchestrationFoundation,
} from "../types";

import {
    createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation,
} from "./execution-intelligence-governance-authorization-boundary-foundation-engine";

function createTrustedOrchestration():
RiverDevExecutionIntelligenceGovernanceOrchestrationFoundation {
    return {
        version: "1.0.0",
        source:
            "river-development-agent-execution-intelligence-governance-orchestration",
        objective: "Implement DEV-239",
        trusted: true,
        orchestrated: true,
        coordination: {} as
            RiverDevExecutionIntelligenceGovernanceOrchestrationFoundation["coordination"],
        orchestrationState: [
            "governance coordination record accepted",
        ],
        orchestrationSignals: [
            "coordinated governed lifecycle activity orchestrated",
        ],
        provenance: [
            "governance orchestration provenance",
        ],
        authorizationBoundaries: [
            "human authorization boundary maintained",
        ],
        scopeBoundaries: [
            "strict scope boundary maintained",
        ],
        blockedReasons: [],
    };
}

function createInput():
RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundationInput {
    return {
        governanceOrchestration:
            createTrustedOrchestration(),

        humanAuthorization: {
            authorized: true,
            authorizedBy: "human-operator",
            authorizationId: "human-auth-dev-239",
            authorizationSignals: [
                "explicit human authorization granted",
            ],
        },

        repositoryAuthorization: {
            authorized: true,
            repositoryRoot: "RIVERKEPTFLOWING",
            authorizationId: "repository-auth-dev-239",
            authorizationSignals: [
                "explicit repository authorization granted",
            ],
        },

        approvedScope: {
            modifiablePaths: [
                "tools/river-dev/src/types.ts",
                "tools/river-dev/src/commands/context.ts",
            ],
            creatablePaths: [
                ".river-dev/specifications/dev-239-river-development-agent-controlled-execution-intelligence-governance-authorization-boundary-foundation.json",
                "tools/river-dev/src/core/execution-intelligence-governance-authorization-boundary-foundation-engine.ts",
                "tools/river-dev/src/core/execution-intelligence-governance-authorization-boundary-foundation-engine.test.ts",
            ],
            excludedPaths: [
                ".env",
                ".git",
                "node_modules",
                "dist",
            ],
        },
    };
}

test(
    "creates authorized governance boundary from trusted orchestration and explicit authorization evidence",
    () => {
        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
                createInput(),
            );

        assert.equal(result.trusted, true);
        assert.equal(result.authorized, true);
        assert.deepEqual(result.blockedReasons, []);
    },
);

test(
    "blocks authorization from untrusted orchestration",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation({
                ...input,
                governanceOrchestration: {
                    ...input.governanceOrchestration,
                    trusted: false,
                },
            });

        assert.equal(result.authorized, false);
    },
);

test(
    "blocks authorization from non-orchestrated governance state",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation({
                ...input,
                governanceOrchestration: {
                    ...input.governanceOrchestration,
                    orchestrated: false,
                },
            });

        assert.equal(result.authorized, false);
    },
);

test(
    "blocks authorization from blocked orchestration",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation({
                ...input,
                governanceOrchestration: {
                    ...input.governanceOrchestration,
                    blockedReasons: [
                        "orchestration blocked",
                    ],
                },
            });

        assert.equal(result.authorized, false);
    },
);

test(
    "blocks authorization when human authorization is missing",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation({
                ...input,
                humanAuthorization: null,
            });

        assert.equal(result.authorized, false);

        assert.ok(
            result.blockedReasons.includes(
                "explicit human authorization evidence is required",
            ),
        );
    },
);

test(
    "blocks authorization when repository authorization is missing",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation({
                ...input,
                repositoryAuthorization: null,
            });

        assert.equal(result.authorized, false);

        assert.ok(
            result.blockedReasons.includes(
                "explicit repository authorization evidence is required",
            ),
        );
    },
);

test(
    "blocks authorization when approved execution scope is missing",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation({
                ...input,
                approvedScope: null,
            });

        assert.equal(result.authorized, false);

        assert.ok(
            result.blockedReasons.includes(
                "explicit approved execution scope is required",
            ),
        );
    },
);

test(
    "preserves orchestration provenance",
    () => {
        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
                createInput(),
            );

        assert.ok(
            result.provenance.includes(
                "governance orchestration provenance",
            ),
        );
    },
);

test(
    "preserves human authorization evidence",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
                input,
            );

        assert.deepEqual(
            result.humanAuthorization,
            input.humanAuthorization,
        );
    },
);

test(
    "preserves repository authorization evidence",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
                input,
            );

        assert.deepEqual(
            result.repositoryAuthorization,
            input.repositoryAuthorization,
        );
    },
);

test(
    "preserves approved execution scope",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
                input,
            );

        assert.deepEqual(
            result.approvedScope,
            input.approvedScope,
        );
    },
);

test(
    "preserves authorization and execution separation",
    () => {
        const result =
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
                createInput(),
            );

        assert.ok(
            result.authorizationBoundaries.includes(
                "governance authorization remains separate from execution approval",
            ),
        );

        assert.ok(
            result.authorizationBoundaries.includes(
                "governance authorization remains separate from execution",
            ),
        );

        assert.ok(
            result.authorizationBoundaries.includes(
                "governance authorization boundary cannot independently execute commands",
            ),
        );

        assert.ok(
            result.scopeBoundaries.includes(
                "governance authorization boundary cannot expand approved execution scope",
            ),
        );
    },
);

test(
    "produces deterministic governance authorization boundary output",
    () => {
        const input = createInput();

        assert.deepEqual(
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
                input,
            ),
            createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
                input,
            ),
        );
    },
);
