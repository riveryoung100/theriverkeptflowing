import type {
    RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation,
    RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundationInput,
} from "../types";

export function createExecutionIntelligenceGovernanceApprovalBoundaryFoundation(
    input: RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundationInput,
): RiverDevExecutionIntelligenceGovernanceApprovalBoundaryFoundation {
    const {
        authorizationBoundary,
        approvalEvidence,
    } = input;

    const trustedAuthorizationBoundary =
        authorizationBoundary.trusted === true &&
        authorizationBoundary.authorized === true &&
        authorizationBoundary.blockedReasons.length === 0;

    const trustedApprovalEvidence =
        approvalEvidence !== null &&
        approvalEvidence.approved === true &&
        approvalEvidence.approvedBy.trim().length > 0 &&
        approvalEvidence.approvalId.trim().length > 0 &&
        approvalEvidence.approvalSignals.length > 0;

    const trusted =
        trustedAuthorizationBoundary &&
        trustedApprovalEvidence;

    const blockedReasons: string[] = [];

    if (!trustedAuthorizationBoundary) {
        blockedReasons.push(
            "governance authorization boundary is not eligible for trusted approval",
        );
    }

    if (!trustedApprovalEvidence) {
        blockedReasons.push(
            "explicit governance approval evidence is required",
        );
    }

    return {
        version: "1.0.0",

        source:
            "river-development-agent-execution-intelligence-governance-approval-boundary",

        objective:
            authorizationBoundary.objective,

        trusted,

        approved:
            trusted,

        authorizationBoundary,

        approvalEvidence,

        approvalState:
            trusted
                ? [
                    "governance authorization boundary accepted",
                    "explicit governance approval evidence accepted",
                    "governance approval boundary created",
                    "controlled approval boundary preserved",
                ]
                : [
                    "governance approval restricted",
                    "explicit approval review required",
                ],

        approvalSignals:
            trusted
                ? [
                    "authorization-boundary trust accepted for approval",
                    "authorization-boundary authorized state accepted for approval",
                    "explicit approval evidence accepted",
                    "governance approval boundary established",
                ]
                : [
                    "governance approval evidence rejected",
                ],

        provenance: [
            ...authorizationBoundary.provenance,
            "governance-authorization-boundary-foundation:v1.0.0",
            "human authorization evidence preserved through approval",
            "repository authorization evidence preserved through approval",
            "approved execution scope preserved through approval",
            "explicit governance approval evidence preserved",
            "governance approval boundary provenance preserved",
        ],

        authorizationBoundaries: [
            ...authorizationBoundary.authorizationBoundaries,
            "explicit governance approval evidence required",
            "authorization alone cannot create an approved governance boundary",
            "governance approval remains separate from execution",
            "governance approval boundary cannot independently modify the repository",
            "governance approval boundary cannot independently execute commands",
        ],

        scopeBoundaries: [
            ...authorizationBoundary.scopeBoundaries,
            "approved execution scope preserved through governance approval",
            "strict scope boundary maintained",
            "governance approval boundary cannot expand approved execution scope",
        ],

        blockedReasons,
    };
}
