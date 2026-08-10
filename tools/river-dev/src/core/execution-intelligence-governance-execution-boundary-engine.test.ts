import {
    createExecutionIntelligenceGovernanceExecutionBoundaryFoundation,
} from "./execution-intelligence-governance-execution-boundary-engine";

import type {
    RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation,
} from "../types";

function assert(
    condition: unknown,
    message: string,
): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function createApprovalBoundary(
    overrides: Partial<RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation> = {},
): RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation {
    return {
        version: "1.0.0",
        source: "test-governance-approval-boundary",
        objective: "preserve controlled execution governance",

        trusted: true,
        approved: true,

        authorizationBoundary: {} as RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation["authorizationBoundary"],

        approvalEvidence: {
            approved: true,
            approvedBy: "human-operator",
            approvalId: "approval-test-001",
            approvalSignals: [
                "explicit human approval",
            ],
        },

        approvalState: [
            "approved",
        ],

        approvalSignals: [
            "explicit human approval",
        ],

        provenance: [
            "upstream-governance-provenance",
            "human-authorization-evidence",
            "repository-authorization-evidence",
            "explicit-approval-evidence",
        ],

        authorizationBoundaries: [
            "upstream-authorization-boundary",
        ],

        scopeBoundaries: [
            "approved-execution-scope",
        ],

        blockedReasons: [],

        ...overrides,
    };
}


function testTrustedApprovedBoundaryCreatesControlledBoundary(): void {
    const approvalBoundary =
        createApprovalBoundary();

    const result =
        createExecutionIntelligenceGovernanceExecutionBoundaryFoundation({
            approvalBoundary,
        });

    assert(
        result.trusted === true,
        "trusted approved unblocked boundary must remain trusted",
    );

    assert(
        result.controlled === true,
        "trusted approved unblocked boundary must create controlled execution boundary",
    );

    assert(
        result.blockedReasons.length === 0,
        "trusted controlled boundary must have no blocked reasons",
    );

    assert(
        result.approvalBoundary === approvalBoundary,
        "approval boundary must be preserved by reference",
    );
}


function testUntrustedApprovalBoundaryFailsClosed(): void {
    const result =
        createExecutionIntelligenceGovernanceExecutionBoundaryFoundation({
            approvalBoundary:
                createApprovalBoundary({
                    trusted: false,
                }),
        });

    assert(
        result.trusted === false,
        "untrusted approval boundary must fail trust",
    );

    assert(
        result.controlled === false,
        "untrusted approval boundary must not create controlled execution boundary",
    );

    assert(
        result.blockedReasons.length > 0,
        "untrusted approval boundary must produce a blocked reason",
    );
}


function testUnapprovedBoundaryFailsClosed(): void {
    const result =
        createExecutionIntelligenceGovernanceExecutionBoundaryFoundation({
            approvalBoundary:
                createApprovalBoundary({
                    approved: false,
                }),
        });

    assert(
        result.trusted === false,
        "unapproved boundary must fail trust",
    );

    assert(
        result.controlled === false,
        "unapproved boundary must not create controlled execution boundary",
    );

    assert(
        result.blockedReasons.length > 0,
        "unapproved boundary must produce a blocked reason",
    );
}


function testBlockedApprovalBoundaryFailsClosed(): void {
    const result =
        createExecutionIntelligenceGovernanceExecutionBoundaryFoundation({
            approvalBoundary:
                createApprovalBoundary({
                    blockedReasons: [
                        "upstream governance blocker",
                    ],
                }),
        });

    assert(
        result.trusted === false,
        "blocked approval boundary must fail trust",
    );

    assert(
        result.controlled === false,
        "blocked approval boundary must not create controlled execution boundary",
    );

    assert(
        result.blockedReasons.length > 0,
        "blocked approval boundary must produce a DEV-241 blocked reason",
    );
}


function testGovernanceEvidenceAndScopeArePreserved(): void {
    const approvalBoundary =
        createApprovalBoundary();

    const result =
        createExecutionIntelligenceGovernanceExecutionBoundaryFoundation({
            approvalBoundary,
        });

    for (const provenance of approvalBoundary.provenance) {
        assert(
            result.provenance.includes(provenance),
            `missing preserved provenance: ${provenance}`,
        );
    }

    for (const boundary of approvalBoundary.authorizationBoundaries) {
        assert(
            result.authorizationBoundaries.includes(boundary),
            `missing preserved authorization boundary: ${boundary}`,
        );
    }

    for (const boundary of approvalBoundary.scopeBoundaries) {
        assert(
            result.scopeBoundaries.includes(boundary),
            `missing preserved scope boundary: ${boundary}`,
        );
    }

    assert(
        result.provenance.includes(
            "human authorization evidence preserved through execution boundary",
        ),
        "human authorization evidence preservation marker missing",
    );

    assert(
        result.provenance.includes(
            "repository authorization evidence preserved through execution boundary",
        ),
        "repository authorization evidence preservation marker missing",
    );

    assert(
        result.provenance.includes(
            "explicit governance approval evidence preserved through execution boundary",
        ),
        "explicit approval evidence preservation marker missing",
    );

    assert(
        result.scopeBoundaries.includes(
            "execution boundary cannot expand approved execution scope",
        ),
        "scope-expansion prohibition missing",
    );
}


function testExecutionAuthorityRemainsSeparated(): void {
    const result =
        createExecutionIntelligenceGovernanceExecutionBoundaryFoundation({
            approvalBoundary:
                createApprovalBoundary(),
        });

    assert(
        result.authorizationBoundaries.includes(
            "approval alone does not perform execution",
        ),
        "approval/execution separation marker missing",
    );

    assert(
        result.authorizationBoundaries.includes(
            "execution boundary remains separate from command execution",
        ),
        "command-execution separation marker missing",
    );

    assert(
        result.authorizationBoundaries.includes(
            "execution boundary cannot independently modify the repository",
        ),
        "repository modification prohibition missing",
    );

    assert(
        result.authorizationBoundaries.includes(
            "execution boundary cannot independently execute arbitrary commands",
        ),
        "arbitrary command execution prohibition missing",
    );

    assert(
        result.authorizationBoundaries.includes(
            "execution boundary grants no autonomous execution authority",
        ),
        "autonomous execution prohibition missing",
    );
}


function run(): void {
    testTrustedApprovedBoundaryCreatesControlledBoundary();
    testUntrustedApprovalBoundaryFailsClosed();
    testUnapprovedBoundaryFailsClosed();
    testBlockedApprovalBoundaryFailsClosed();
    testGovernanceEvidenceAndScopeArePreserved();
    testExecutionAuthorityRemainsSeparated();

    console.log(
        "DEV-241 governance execution boundary tests PASS",
    );
}

run();