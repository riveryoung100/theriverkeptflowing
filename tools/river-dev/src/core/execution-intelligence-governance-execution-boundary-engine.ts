import type {
    RiverDevExecutionIntelligenceGovernanceExecutionBoundaryFoundation,
    RiverDevExecutionIntelligenceGovernanceExecutionBoundaryFoundationInput,
} from "../types";

export function createExecutionIntelligenceGovernanceExecutionBoundaryFoundation(
    input: RiverDevExecutionIntelligenceGovernanceExecutionBoundaryFoundationInput,
): RiverDevExecutionIntelligenceGovernanceExecutionBoundaryFoundation {
    const {
        approvalBoundary,
    } = input;

    const trustedApprovalBoundary =
        approvalBoundary.trusted === true &&
        approvalBoundary.approved === true &&
        approvalBoundary.blockedReasons.length === 0;

    const trusted =
        trustedApprovalBoundary;

    const controlled =
        trusted;

    const blockedReasons: string[] = [];

    if (!trustedApprovalBoundary) {
        blockedReasons.push(
            "governance approval boundary is not eligible for controlled execution",
        );
    }

    return {
        version: "1.0.0",

        source:
            "river-development-agent-execution-intelligence-governance-execution-boundary",

        objective:
            approvalBoundary.objective,

        trusted,

        controlled,

        approvalBoundary,

        executionState:
            controlled
                ? [
                    "governance approval boundary accepted",
                    "controlled execution boundary created",
                    "approved execution scope preserved",
                    "execution remains separated from command execution",
                ]
                : [
                    "governance execution boundary blocked",
                    "trusted approved governance boundary required",
                ],

        executionSignals:
            controlled
                ? [
                    "approval-boundary trust accepted for execution boundary",
                    "approval-boundary approved state accepted for execution boundary",
                    "controlled execution boundary established",
                    "execution authority remains constrained",
                ]
                : [
                    "governance execution boundary rejected",
                ],

        provenance: [
            ...approvalBoundary.provenance,
            "governance-approval-boundary-foundation:v1.0.0",
            "human authorization evidence preserved through execution boundary",
            "repository authorization evidence preserved through execution boundary",
            "approved execution scope preserved through execution boundary",
            "explicit governance approval evidence preserved through execution boundary",
            "governance execution boundary provenance preserved",
        ],

        authorizationBoundaries: [
            ...approvalBoundary.authorizationBoundaries,
            "trusted approved governance boundary required",
            "approval alone does not perform execution",
            "execution boundary remains separate from command execution",
            "execution boundary cannot independently modify the repository",
            "execution boundary cannot independently execute arbitrary commands",
            "execution boundary grants no autonomous execution authority",
        ],

        scopeBoundaries: [
            ...approvalBoundary.scopeBoundaries,
            "approved execution scope preserved through execution boundary",
            "strict execution scope boundary maintained",
            "execution boundary cannot expand approved execution scope",
        ],

        blockedReasons,
    };
}