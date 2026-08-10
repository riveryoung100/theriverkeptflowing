import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundationInput,
    RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation,
} from "../types";

import {
    createExecutionIntelligenceGovernanceApprovalBoundaryFoundation,
} from "./execution-intelligence-governance-approval-boundary-foundation-engine";

function createTrustedAuthorizationBoundary():
RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation {
    return {
        version: "1.0.0",

        source:
            "river-development-agent-execution-intelligence-governance-authorization-boundary",

        objective:
            "Implement DEV-240",

        trusted: true,

        authorized: true,

        orchestration: {} as
            RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation["orchestration"],

        humanAuthorization: {
            authorized: true,
            authorizedBy: "human-operator",
            authorizationId: "human-auth-dev-240",
            authorizationSignals: [
                "explicit human authorization preserved",
            ],
        },

        repositoryAuthorization: {
            authorized: true,
            repositoryRoot: "RIVERKEPTFLOWING",
            authorizationId: "repository-auth-dev-240",
            authorizationSignals: [
                "explicit repository authorization preserved",
            ],
        },

        approvedScope: {
            modifiablePaths: [
                "tools/river-dev/src/types.ts",
                "tools/river-dev/src/commands/context.ts",
            ],

            creatablePaths: [
                ".river-dev/specifications/dev-240-river-development-agent-controlled-execution-intelligence-governance-approval-boundary-foundation.json",
                "tools/river-dev/src/core/execution-intelligence-governance-approval-boundary-foundation-engine.ts",
                "tools/river-dev/src/core/execution-intelligence-governance-approval-boundary-foundation-engine.test.ts",
            ],

            excludedPaths: [
                ".env",
                ".git",
                "node_modules",
                "dist",
            ],
        },

        authorizationState: [
            "governance authorization boundary created",
        ],

        authorizationSignals: [
            "explicit authorization evidence accepted",
        ],

        provenance: [
            "governance authorization boundary provenance",
        ],

        authorizationBoundaries: [
            "governance authorization remains separate from execution approval",
            "governance authorization boundary cannot independently modify the repository",
        ],

        scopeBoundaries: [
            "strict scope boundary maintained",
            "governance authorization boundary cannot expand approved execution scope",
        ],

        blockedReasons: [],
    };
}

function createInput():
RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundationInput {
    return {
        authorizationBoundary:
            createTrustedAuthorizationBoundary(),

        approvalEvidence: {
            approved: true,
            approvedBy: "human-approver",
            approvalId: "approval-dev-240",
            approvalSignals: [
                "explicit governance approval granted",
            ],
        },
    };
}

test(
    "creates approved governance boundary from trusted authorization and explicit approval evidence",
    () => {
        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
                createInput(),
            );

        assert.equal(result.trusted, true);
        assert.equal(result.approved, true);
        assert.deepEqual(result.blockedReasons, []);
    },
);

test(
    "blocks approval from untrusted authorization boundary",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation({
                ...input,
                authorizationBoundary: {
                    ...input.authorizationBoundary,
                    trusted: false,
                },
            });

        assert.equal(result.trusted, false);
        assert.equal(result.approved, false);
    },
);

test(
    "blocks approval from non-authorized authorization boundary",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation({
                ...input,
                authorizationBoundary: {
                    ...input.authorizationBoundary,
                    authorized: false,
                },
            });

        assert.equal(result.trusted, false);
        assert.equal(result.approved, false);
    },
);

test(
    "blocks approval from blocked authorization boundary",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation({
                ...input,
                authorizationBoundary: {
                    ...input.authorizationBoundary,
                    blockedReasons: [
                        "authorization boundary blocked",
                    ],
                },
            });

        assert.equal(result.trusted, false);
        assert.equal(result.approved, false);
    },
);

test(
    "blocks approval when approval evidence is missing",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation({
                ...input,
                approvalEvidence: null,
            });

        assert.equal(result.trusted, false);
        assert.equal(result.approved, false);

        assert.ok(
            result.blockedReasons.includes(
                "explicit governance approval evidence is required",
            ),
        );
    },
);

test(
    "blocks approval when approval evidence is not affirmative",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation({
                ...input,
                approvalEvidence: {
                    ...input.approvalEvidence!,
                    approved: false,
                },
            });

        assert.equal(result.trusted, false);
        assert.equal(result.approved, false);
    },
);

test(
    "blocks approval when approver identity is missing",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation({
                ...input,
                approvalEvidence: {
                    ...input.approvalEvidence!,
                    approvedBy: "   ",
                },
            });

        assert.equal(result.trusted, false);
        assert.equal(result.approved, false);
    },
);

test(
    "blocks approval when approval id is missing",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation({
                ...input,
                approvalEvidence: {
                    ...input.approvalEvidence!,
                    approvalId: "",
                },
            });

        assert.equal(result.trusted, false);
        assert.equal(result.approved, false);
    },
);

test(
    "blocks approval when approval signals are missing",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation({
                ...input,
                approvalEvidence: {
                    ...input.approvalEvidence!,
                    approvalSignals: [],
                },
            });

        assert.equal(result.trusted, false);
        assert.equal(result.approved, false);
    },
);

test(
    "preserves DEV-239 human authorization evidence",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
                input,
            );

        assert.deepEqual(
            result.authorizationBoundary.humanAuthorization,
            input.authorizationBoundary.humanAuthorization,
        );
    },
);

test(
    "preserves DEV-239 repository authorization evidence",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
                input,
            );

        assert.deepEqual(
            result.authorizationBoundary.repositoryAuthorization,
            input.authorizationBoundary.repositoryAuthorization,
        );
    },
);

test(
    "preserves DEV-239 approved execution scope",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
                input,
            );

        assert.deepEqual(
            result.authorizationBoundary.approvedScope,
            input.authorizationBoundary.approvedScope,
        );
    },
);

test(
    "preserves explicit approval evidence",
    () => {
        const input = createInput();

        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
                input,
            );

        assert.deepEqual(
            result.approvalEvidence,
            input.approvalEvidence,
        );
    },
);

test(
    "preserves authorization approval and execution separation",
    () => {
        const result =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
                createInput(),
            );

        assert.ok(
            result.authorizationBoundaries.includes(
                "authorization alone cannot create an approved governance boundary",
            ),
        );

        assert.ok(
            result.authorizationBoundaries.includes(
                "governance approval remains separate from execution",
            ),
        );

        assert.ok(
            result.authorizationBoundaries.includes(
                "governance approval boundary cannot independently modify the repository",
            ),
        );

        assert.ok(
            result.authorizationBoundaries.includes(
                "governance approval boundary cannot independently execute commands",
            ),
        );

        assert.ok(
            result.scopeBoundaries.includes(
                "governance approval boundary cannot expand approved execution scope",
            ),
        );
    },
);

test(
    "produces deterministic governance approval boundary output",
    () => {
        const input = createInput();

        const first =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
                input,
            );

        const second =
            createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
                input,
            );

        assert.deepEqual(first, second);
    },
);
