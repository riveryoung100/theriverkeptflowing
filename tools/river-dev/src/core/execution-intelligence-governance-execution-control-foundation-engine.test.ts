import test from "node:test";
import assert from "node:assert/strict";

import type {
    RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation,
    RiverDevExecutionIntelligenceGovernanceExecutionBoundaryFoundation,
} from "../types";

import {
    createExecutionIntelligenceGovernanceExecutionControlFoundation,
} from "./execution-intelligence-governance-execution-control-foundation-engine";

function createApprovalBoundary(
    overrides: Partial<RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation {
    return {
        version: "1.0.0",
        source:
            "river-development-agent-execution-intelligence-governance-approval-boundary",
        objective: "govern repository execution",

        trusted: true,
        approved: true,

        authorizationBoundary:
            {} as RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation["authorizationBoundary"],

        approvalEvidence: {
            approved: true,
            approvedBy: "human-reviewer",
            approvalId: "approval-test",
            approvalSignals: [
                "explicit approval preserved",
            ],
        },

        approvalState: [
            "approval boundary established",
        ],

        approvalSignals: [
            "explicit approval accepted",
        ],

        provenance: [
            "human authorization evidence preserved",
            "repository authorization evidence preserved",
            "explicit governance approval evidence preserved",
        ],

        authorizationBoundaries: [
            "approval remains governed",
        ],

        scopeBoundaries: [
            "approved execution scope preserved",
        ],

        blockedReasons: [],

        ...overrides,
    };
}

function createExecutionBoundary(
    overrides: Partial<RiverDevExecutionIntelligenceGovernanceExecutionBoundaryFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceExecutionBoundaryFoundation {
    return {
        version: "1.0.0",

        source:
            "river-development-agent-execution-intelligence-governance-execution-boundary",

        objective:
            "govern repository execution",

        trusted: true,

        controlled: true,

        approvalBoundary:
            createApprovalBoundary(),

        executionState: [
            "controlled execution boundary created",
        ],

        executionSignals: [
            "controlled execution boundary established",
        ],

        provenance: [
            "human authorization evidence preserved",
            "repository authorization evidence preserved",
            "explicit governance approval evidence preserved",
            "approved execution scope preserved",
            "governance execution boundary provenance preserved",
        ],

        authorizationBoundaries: [
            "execution boundary remains separate from command execution",
        ],

        scopeBoundaries: [
            "approved execution scope preserved through execution boundary",
        ],

        blockedReasons: [],

        ...overrides,
    };
}

test(
    "creates trusted governed execution control from eligible DEV-241 boundary",
    () => {
        const executionBoundary =
            createExecutionBoundary();

        const control =
            createExecutionIntelligenceGovernanceExecutionControlFoundation({
                executionBoundary,
            });

        assert.equal(
            control.trusted,
            true,
        );

        assert.equal(
            control.controlled,
            true,
        );

        assert.equal(
            control.authorized,
            true,
        );

        assert.equal(
            control.executionBoundary,
            executionBoundary,
        );

        assert.equal(
            control.blockedReasons.length,
            0,
        );

        assert.equal(
            control.executionRequest.length > 0,
            true,
        );

        assert.equal(
            control.executionRequest.includes(
                "governed execution request created",
            ),
            true,
        );
    },
);

test(
    "fails closed when DEV-241 execution boundary is untrusted",
    () => {
        const control =
            createExecutionIntelligenceGovernanceExecutionControlFoundation({
                executionBoundary:
                    createExecutionBoundary({
                        trusted: false,
                    }),
            });

        assert.equal(control.trusted, false);
        assert.equal(control.controlled, false);
        assert.equal(control.authorized, false);

        assert.equal(
            control.blockedReasons.length > 0,
            true,
        );

        assert.equal(
            control.executionRequest.includes(
                "governed execution request blocked",
            ),
            true,
        );
    },
);

test(
    "fails closed when DEV-241 execution boundary is not controlled",
    () => {
        const control =
            createExecutionIntelligenceGovernanceExecutionControlFoundation({
                executionBoundary:
                    createExecutionBoundary({
                        controlled: false,
                    }),
            });

        assert.equal(control.trusted, false);
        assert.equal(control.controlled, false);
        assert.equal(control.authorized, false);

        assert.equal(
            control.blockedReasons.length > 0,
            true,
        );
    },
);

test(
    "fails closed when DEV-241 execution boundary contains blockers",
    () => {
        const control =
            createExecutionIntelligenceGovernanceExecutionControlFoundation({
                executionBoundary:
                    createExecutionBoundary({
                        blockedReasons: [
                            "upstream execution boundary blocked",
                        ],
                    }),
            });

        assert.equal(control.trusted, false);
        assert.equal(control.controlled, false);
        assert.equal(control.authorized, false);

        assert.equal(
            control.blockedReasons.length > 0,
            true,
        );
    },
);

test(
    "preserves upstream governance provenance and boundaries",
    () => {
        const executionBoundary =
            createExecutionBoundary();

        const control =
            createExecutionIntelligenceGovernanceExecutionControlFoundation({
                executionBoundary,
            });

        assert.equal(
            control.provenance.includes(
                "human authorization evidence preserved",
            ),
            true,
        );

        assert.equal(
            control.provenance.includes(
                "repository authorization evidence preserved",
            ),
            true,
        );

        assert.equal(
            control.provenance.includes(
                "explicit governance approval evidence preserved",
            ),
            true,
        );

        assert.equal(
            control.scopeBoundaries.includes(
                "approved execution scope preserved through execution boundary",
            ),
            true,
        );

        assert.equal(
            control.authorizationBoundaries.includes(
                "execution boundary remains separate from command execution",
            ),
            true,
        );
    },
);

test(
    "records that authorization and execution request do not grant runtime authority",
    () => {
        const control =
            createExecutionIntelligenceGovernanceExecutionControlFoundation({
                executionBoundary:
                    createExecutionBoundary(),
            });

        assert.equal(
            control.authorizationBoundaries.includes(
                "authorized does not grant command execution authority",
            ),
            true,
        );

        assert.equal(
            control.authorizationBoundaries.includes(
                "execution request does not independently modify the repository",
            ),
            true,
        );

        assert.equal(
            control.authorizationBoundaries.includes(
                "execution request does not independently execute arbitrary commands",
            ),
            true,
        );

        assert.equal(
            control.authorizationBoundaries.includes(
                "execution control cannot independently commit repository changes",
            ),
            true,
        );

        assert.equal(
            control.authorizationBoundaries.includes(
                "execution control cannot independently push repository changes",
            ),
            true,
        );

        assert.equal(
            control.authorizationBoundaries.includes(
                "execution control grants no autonomous execution authority",
            ),
            true,
        );

        assert.equal(
            control.scopeBoundaries.includes(
                "execution control cannot expand approved execution scope",
            ),
            true,
        );
    },
);
