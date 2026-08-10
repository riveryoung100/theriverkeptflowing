import type {
    RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation,
    RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundationInput,
} from "../types";

export function createExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation(
    input: RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundationInput,
): RiverDevExecutionIntelligenceGovernanceAuthorizationBoundaryFoundation {
    const {
        governanceOrchestration,
        humanAuthorization,
        repositoryAuthorization,
        approvedScope,
    } = input;

    const trustedOrchestration =
        governanceOrchestration.trusted === true &&
        governanceOrchestration.orchestrated === true &&
        governanceOrchestration.blockedReasons.length === 0;

    const trustedHumanAuthorization =
        humanAuthorization !== null &&
        humanAuthorization.authorized === true &&
        humanAuthorization.authorizedBy.trim().length > 0 &&
        humanAuthorization.authorizationId.trim().length > 0 &&
        humanAuthorization.authorizationSignals.length > 0;

    const trustedRepositoryAuthorization =
        repositoryAuthorization !== null &&
        repositoryAuthorization.authorized === true &&
        repositoryAuthorization.repositoryRoot.trim().length > 0 &&
        repositoryAuthorization.authorizationId.trim().length > 0 &&
        repositoryAuthorization.authorizationSignals.length > 0;

    const trustedApprovedScope =
        approvedScope !== null;

    const trusted =
        trustedOrchestration &&
        trustedHumanAuthorization &&
        trustedRepositoryAuthorization &&
        trustedApprovedScope;

    const blockedReasons: string[] = [];

    if (!trustedOrchestration) {
        blockedReasons.push(
            "governance orchestration is not eligible for trusted authorization",
        );
    }

    if (!trustedHumanAuthorization) {
        blockedReasons.push(
            "explicit human authorization evidence is required",
        );
    }

    if (!trustedRepositoryAuthorization) {
        blockedReasons.push(
            "explicit repository authorization evidence is required",
        );
    }

    if (!trustedApprovedScope) {
        blockedReasons.push(
            "explicit approved execution scope is required",
        );
    }

    return {
        version: "1.0.0",

        source:
            "river-development-agent-execution-intelligence-governance-authorization-boundary",

        objective:
            governanceOrchestration.objective,

        trusted,

        authorized:
            trusted,

        orchestration:
            governanceOrchestration,

        humanAuthorization,

        repositoryAuthorization,

        approvedScope,

        authorizationState:
            trusted
                ? [
                    "governance orchestration record accepted",
                    "explicit human authorization accepted",
                    "explicit repository authorization accepted",
                    "explicit approved execution scope accepted",
                    "governance authorization boundary created",
                    "controlled authorization boundary preserved",
                ]
                : [
                    "governance authorization restricted",
                    "explicit authorization evidence review required",
                ],

        authorizationSignals:
            trusted
                ? [
                    "governance orchestration trust accepted for authorization",
                    "human authorization evidence accepted",
                    "repository authorization evidence accepted",
                    "approved execution scope accepted",
                    "governance authorization boundary established",
                ]
                : [
                    "governance authorization evidence rejected",
                ],

        provenance: [
            ...governanceOrchestration.provenance,
            "governance-orchestration-foundation:v1.0.0",
            "human authorization evidence preserved",
            "repository authorization evidence preserved",
            "approved execution scope preserved",
            "governance authorization boundary provenance preserved",
        ],

        authorizationBoundaries: [
            ...governanceOrchestration.authorizationBoundaries,
            "explicit human authorization required",
            "explicit repository authorization required",
            "trusted orchestration alone cannot create an authorized governance boundary",
            "governance authorization remains separate from execution approval",
            "governance authorization remains separate from execution",
            "governance authorization boundary cannot independently modify the repository",
            "governance authorization boundary cannot independently execute commands",
        ],

        scopeBoundaries: [
            ...governanceOrchestration.scopeBoundaries,
            "approved execution scope explicitly preserved",
            "strict scope boundary maintained",
            "governance authorization boundary cannot expand approved execution scope",
        ],

        blockedReasons,
    };
}
